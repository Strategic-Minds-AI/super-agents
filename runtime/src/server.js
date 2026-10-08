import http from 'http';
import { assertRuntimeConfig, config } from './config.js';
import { query, closeDb } from './db.js';
import { listAgents } from './agentRegistry.js';
import { runCycles } from './taskEngine.js';

assertRuntimeConfig();

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function authorized(req) {
  const header = req.headers.authorization || '';
  return header === `Bearer ${config.runtimeToken}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://runtime.local');

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const db = await query('SELECT now() AS now');
      return json(res, 200, {
        ok: true,
        runtime: 'repo-native-super-agents',
        source_sha: config.sourceSha,
        database_time: db.rows[0].now,
        agents: await listAgents(),
      });
    }

    if (!authorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }

    if (req.method === 'POST' && url.pathname === '/v1/run-once') {
      const body = await readJson(req);
      const agentName = String(body.agent_name || '').trim();
      const workerId = String(body.worker_id || '').trim();
      if (!agentName || !workerId) {
        return json(res, 400, { error: 'agent_name and worker_id are required' });
      }

      const agents = await listAgents();
      if (!agents.includes(agentName)) {
        return json(res, 400, { error: 'Unknown agent', agent_name: agentName });
      }

      const result = await runCycles({
        agentName,
        workerId,
        maxCycles: body.max_cycles || 1,
        runtime: body.runtime || 'docker',
      });
      return json(res, 200, result);
    }

    if (req.method === 'POST' && url.pathname === '/v1/tasks') {
      const body = await readJson(req);
      const agentName = String(body.agent_name || '').trim();
      const taskType = String(body.task_type || '').trim();
      const title = String(body.title || '').trim();
      if (!agentName || !taskType || !title) {
        return json(res, 400, { error: 'agent_name, task_type and title are required' });
      }

      const autonomous = body.autonomous === true;
      const status = autonomous ? 'pending' : 'needs_approval';
      const result = await query(`
        INSERT INTO agent_tasks(
          agent_name, task_type, title, description, domain, priority,
          autonomous, status, payload
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        RETURNING *
      `, [
        agentName,
        taskType,
        title,
        body.description || null,
        body.domain || null,
        body.priority || 'medium',
        autonomous,
        status,
        JSON.stringify(body.payload || {}),
      ]);
      return json(res, 201, result.rows[0]);
    }

    if (req.method === 'GET' && url.pathname === '/v1/status') {
      const [tasks, workers, runs] = await Promise.all([
        query(`SELECT status, count(*)::int AS count FROM agent_tasks GROUP BY status ORDER BY status`),
        query(`SELECT * FROM worker_heartbeats ORDER BY agent_name`),
        query(`SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 20`),
      ]);
      return json(res, 200, {
        tasks: tasks.rows,
        workers: workers.rows,
        recent_runs: runs.rows,
      });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('runtime_error', error);
    return json(res, 500, { error: String(error?.message || error) });
  }
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`super_agents_runtime_listening port=${config.port} source_sha=${config.sourceSha}`);
});

async function shutdown(signal) {
  console.log(`runtime_shutdown signal=${signal}`);
  server.close(async () => {
    await closeDb().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
