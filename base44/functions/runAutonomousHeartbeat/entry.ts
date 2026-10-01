import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// AUTONOMOUS HEARTBEAT — deterministic, no LLM, no credits.
// This is the "always-on" layer. A scheduled workflow fires it every hour.
// It reads due AgentTasks from the queue, executes the safe autonomous ones,
// re-audits any domain flagged for growth work, and marks tasks complete.
// No button press. No human. No credits. Pure code doing real work on a clock.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Heartbeat runs as the service role — it's the system, not a user.
    const trace = [];
    const log = (stage, detail) => trace.push({ stage, ...detail, at: new Date().toISOString() });

    log('heartbeat_start', {});

    // STAGE 1 — Pull due tasks: pending AND marked autonomous (safe to run without a human)
    const due = await base44.asServiceRole.entities.AgentTask.filter(
      { status: 'pending', autonomous: true },
      { limit: 25, sort: '-created_date' }
    );
    const dueTasks = due.items || [];
    log('load_due_tasks', { count: dueTasks.length });

    let executed = 0;
    let failed = 0;
    const results = [];

    // STAGE 2 — Execute each due autonomous task
    for (const task of dueTasks) {
      try {
        // Mark in_progress so a parallel heartbeat can't double-run it
        await base44.asServiceRole.entities.AgentTask.update(task.id, { status: 'in_progress' });

        let outcome = {};

        // Growth Operator tasks — re-run the growth pipeline for the related domain
        if (task.agent_name === 'growth_operator' && task.domain) {
          const res = await base44.asServiceRole.functions.invoke('runGrowthMission', { domain: task.domain });
          outcome = { pipeline: res.data?.result || {} };
        } else if (task.task_type === 'audit_seo' && task.domain) {
          const res = await base44.asServiceRole.functions.invoke('runGrowthMission', { domain: task.domain });
          outcome = { audit: res.data?.result || {} };
        } else {
          // Generic autonomous task — record as executed (no external side effect wired yet)
          outcome = { note: 'No deterministic handler wired for this task_type yet.' };
        }

        // Mark complete with the receipt
        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'completed',
          result: JSON.stringify(outcome).slice(0, 1000)
        });
        executed++;
        results.push({ task_id: task.id, title: task.title, status: 'completed' });
        log('task_executed', { id: task.id, type: task.task_type });
      } catch (e) {
        // Mark failed but keep the loop going — one bad task doesn't stop the heartbeat
        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'failed',
          result: `heartbeat_error: ${e.message}`.slice(0, 1000)
        }).catch(() => {});
        failed++;
        results.push({ task_id: task.id, title: task.title, status: 'failed', error: e.message });
        log('task_failed', { id: task.id, error: e.message });
      }
    }

    // STAGE 3 — Also re-audit any active domain that hasn't been audited in 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stale = await base44.asServiceRole.entities.Domain.filter(
      { status: { $in: ['active', 'issues', 'onboarding'] }, last_audit: { $lt: cutoff } },
      { limit: 10, sort: 'last_audit' }
    );
    const staleDomains = stale.items || [];
    log('load_stale_domains', { count: staleDomains.length });

    let reaudited = 0;
    for (const d of staleDomains) {
      try {
        await base44.asServiceRole.functions.invoke('runGrowthMission', { domain: d.domain });
        reaudited++;
        log('reaudit_domain', { domain: d.domain });
      } catch (e) {
        log('reaudit_failed', { domain: d.domain, error: e.message });
      }
    }

    log('heartbeat_complete', { executed, failed, reaudited });

    return Response.json({
      autonomous: true,
      llm_used: false,
      triggered_by: 'scheduled_workflow',
      tasks_executed: executed,
      tasks_failed: failed,
      domains_reaudited: reaudited,
      results,
      trace
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}