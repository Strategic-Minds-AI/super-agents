import { query, withTransaction } from './db.js';
import { config } from './config.js';
import { getAgent } from './agentRegistry.js';
import { runAgentModel } from './openai.js';

const PROTECTED_TYPES = new Set([
  'buy_domain',
  'dns_change',
  'production_deploy',
  'default_branch_merge',
  'send_report',
  'send_email',
  'send_sms',
  'publish_social',
  'social_connect',
  'google_connect',
  'request_indexing',
  'video_generate',
  'payment',
  'purchase',
  'permission_change',
  'secret_change',
]);

const PRIORITY_SQL = `
  CASE priority
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    ELSE 3
  END
`;

async function heartbeat(agentName, workerId, runtime = 'docker') {
  await query(`
    INSERT INTO worker_heartbeats(worker_id, agent_name, runtime, status, source_sha, last_seen_at)
    VALUES ($1,$2,$3,'online',$4,now())
    ON CONFLICT (worker_id) DO UPDATE SET
      agent_name = EXCLUDED.agent_name,
      runtime = EXCLUDED.runtime,
      status = 'online',
      source_sha = EXCLUDED.source_sha,
      last_seen_at = now()
  `, [workerId, agentName, runtime, config.sourceSha]);
}

export async function recoverExpiredLeases(agentName) {
  const res = await query(`
    UPDATE agent_tasks
    SET
      status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = now(),
      result = CASE
        WHEN attempts >= max_attempts THEN jsonb_build_object('error','lease_expired_retry_exhausted')
        ELSE result
      END
    WHERE agent_name = $1
      AND status = 'in_progress'
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at < now()
    RETURNING id, status
  `, [agentName]);
  return res.rows;
}

export async function claimTask(agentName, workerId) {
  return withTransaction(async client => {
    const selected = await client.query(`
      SELECT *
      FROM agent_tasks
      WHERE agent_name = $1
        AND status = 'pending'
        AND autonomous = true
        AND run_after <= now()
      ORDER BY ${PRIORITY_SQL}, created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `, [agentName]);

    if (!selected.rowCount) return null;
    const task = selected.rows[0];

    const updated = await client.query(`
      UPDATE agent_tasks
      SET status = 'in_progress',
          lease_owner = $2,
          lease_expires_at = now() + ($3 || ' seconds')::interval,
          attempts = attempts + 1,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [task.id, workerId, String(config.leaseSeconds)]);

    return updated.rows[0];
  });
}

async function createRun(task, workerId) {
  const res = await query(`
    INSERT INTO agent_runs(task_id, agent_name, worker_id, source_sha, status, input)
    VALUES ($1,$2,$3,$4,'started',$5::jsonb)
    RETURNING id
  `, [
    task.id,
    task.agent_name,
    workerId,
    config.sourceSha,
    JSON.stringify({
      task_type: task.task_type,
      title: task.title,
      domain: task.domain,
      payload: task.payload || {},
    }),
  ]);
  return res.rows[0].id;
}

async function finishRun(runId, status, output = null, error = null, model = null) {
  await query(`
    UPDATE agent_runs
    SET status=$2,
        output=$3::jsonb,
        error=$4,
        model=$5,
        completed_at=now()
    WHERE id=$1
  `, [runId, status, JSON.stringify(output || {}), error, model]);
}

async function completeTask(taskId, result) {
  await query(`
    UPDATE agent_tasks
    SET status='completed',
        result=$2::jsonb,
        lease_owner=NULL,
        lease_expires_at=NULL,
        updated_at=now()
    WHERE id=$1
  `, [taskId, JSON.stringify(result || {})]);
}

async function failTask(task, error) {
  const finalFailure = task.attempts >= task.max_attempts;
  await query(`
    UPDATE agent_tasks
    SET status=$2,
        result=$3::jsonb,
        lease_owner=NULL,
        lease_expires_at=NULL,
        run_after=CASE WHEN $2='pending' THEN now() + interval '60 seconds' ELSE run_after END,
        updated_at=now()
    WHERE id=$1
  `, [
    task.id,
    finalFailure ? 'failed' : 'pending',
    JSON.stringify({ error: String(error?.message || error).slice(0, 2000) }),
  ]);
}

async function gateTask(task, reason) {
  await withTransaction(async client => {
    await client.query(`
      UPDATE agent_tasks
      SET status='needs_approval',
          autonomous=false,
          result=$2::jsonb,
          lease_owner=NULL,
          lease_expires_at=NULL,
          updated_at=now()
      WHERE id=$1
    `, [task.id, JSON.stringify({ gated: true, reason })]);

    await client.query(`
      INSERT INTO approval_requests(task_id, action_class, reason)
      VALUES ($1,'PROTECTED',$2)
    `, [task.id, reason]);
  });
}

async function safeDeterministicTask(task) {
  if (task.task_type !== 'submit_sitemap' || !task.domain) return null;

  const domain = task.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://${domain}/sitemap.xml`, { signal: controller.signal });
    let urlCount = 0;
    if (res.ok) {
      const text = await res.text();
      urlCount = (text.match(/<loc>/g) || []).length;
    }
    return {
      handled: true,
      result: {
        sitemap_verified: res.ok,
        urls_found: urlCount,
        domain,
        mutation_performed: false,
      },
    };
  } catch (error) {
    return {
      handled: true,
      result: {
        sitemap_verified: false,
        urls_found: 0,
        domain,
        error: error.name === 'AbortError' ? 'timeout' : error.message,
        mutation_performed: false,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function executeTask(task, workerId) {
  const runId = await createRun(task, workerId);

  if (PROTECTED_TYPES.has(task.task_type)) {
    const reason = `Task type ${task.task_type} is approval-gated by runtime policy`;
    await gateTask(task, reason);
    await finishRun(runId, 'needs_approval', { gated: true, reason });
    return { status: 'needs_approval', task_id: task.id, reason };
  }

  try {
    const deterministic = await safeDeterministicTask(task);
    if (deterministic?.handled) {
      await completeTask(task.id, deterministic.result);
      await finishRun(runId, 'completed', deterministic.result, null, 'deterministic');
      return { status: 'completed', task_id: task.id, result: deterministic.result };
    }

    const agent = await getAgent(task.agent_name);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.taskTimeoutMs);
    let result;
    try {
      result = await runAgentModel(agent, task, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    await completeTask(task.id, result);
    await finishRun(runId, 'completed', result, null, result.model);
    return { status: 'completed', task_id: task.id, result };
  } catch (error) {
    await failTask(task, error);
    await finishRun(runId, 'failed', null, String(error?.message || error));
    return { status: 'failed', task_id: task.id, error: String(error?.message || error) };
  }
}

export async function runCycles({ agentName, workerId, maxCycles = 1, runtime = 'docker' }) {
  const cap = Math.max(1, Math.min(Number(maxCycles) || 1, config.maxCyclesCap));
  await heartbeat(agentName, workerId, runtime);
  const recovered = await recoverExpiredLeases(agentName);
  const results = [];

  for (let i = 0; i < cap; i++) {
    const task = await claimTask(agentName, workerId);
    if (!task) break;
    results.push(await executeTask(task, workerId));
    await heartbeat(agentName, workerId, runtime);
  }

  return {
    agent_name: agentName,
    worker_id: workerId,
    source_sha: config.sourceSha,
    recovered_leases: recovered.length,
    cycles_requested: cap,
    actions: results,
    idle: results.length === 0,
  };
}
