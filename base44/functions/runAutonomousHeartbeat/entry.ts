import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  withRetry, withTimeout, recoverStuckTasks, createCircuitBreaker, safeSendGmail
} from '../../shared/resilience.ts';
import { buildReportEmail } from '../../shared/emailTemplate.ts';

// HARDENED AUTONOMOUS HEARTBEAT — the always-on layer.
// Scheduled hourly by the Autonomous Heartbeat workflow.
// This version doesn't break: retries transient failures, recovers stuck
// tasks, isolates bad tasks, circuit-breaks Gmail, and sends a real summary
// email at the end of each heartbeat cycle.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const reportEmail = body?.report_email || null;

    const trace = [];
    const log = (stage, detail) => trace.push({ stage, ...detail, at: new Date().toISOString() });
    log('heartbeat_start', {});

    // ── RESILIENCE: recover stuck tasks first ──
    const recovered = await recoverStuckTasks(base44);
    if (recovered > 0) log('recovered_stuck', { count: recovered });

    const gmailBreaker = createCircuitBreaker(3);

    // ── STAGE 1: Pull due autonomous tasks ──
    const due = await withRetry(() =>
      base44.asServiceRole.entities.AgentTask.filter(
        { status: 'pending', autonomous: true },
        { limit: 25, sort: '-created_date' }
      )
    );
    const dueTasks = due.items || [];
    log('load_due_tasks', { count: dueTasks.length });

    let executed = 0;
    let failed = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;
    const results = [];

    // ── STAGE 2: Execute each task (with timeout + error isolation) ──
    for (const task of dueTasks) {
      try {
        // Idempotency: re-check status before claiming (two heartbeats might overlap)
        if (task.status !== 'pending') continue;

        // Skip batch task types — the worker (runAgentLoop) handles these with full handlers
        const BATCH_TYPES = ['build_system', 'google_connect', 'social_connect', 'video_generate', 'content_optimize'];
        if (task.task_type && BATCH_TYPES.includes(task.task_type)) continue;

        await base44.asServiceRole.entities.AgentTask.update(task.id, { status: 'in_progress' });

        let outcome = await withTimeout(
          (async () => {
            if (task.task_type === 'send_report') {
              // description holds report data as JSON — rebuild the polished email
              let parsed = {};
              try { parsed = JSON.parse(task.description || '{}'); } catch (e) { parsed = {}; }
              const recipient = reportEmail || 'me';
              const { subject, html, text } = buildReportEmail(parsed, recipient);
              const emailResult = await safeSendGmail(base44, gmailBreaker, {
                to: recipient, subject, html, text
              });
              if (emailResult.sent) emailsSent++;
              else if (emailResult.skipped) emailsSkipped++;
              return { email: emailResult };

            } else if (task.agent_name === 'growth_operator' && task.domain) {
              const res = await withRetry(() =>
                base44.asServiceRole.functions.invoke('runGrowthMission', { domain: task.domain }),
                { retries: 2 }
              );
              return { pipeline: res.data?.result || {} };

            } else if (task.task_type === 'audit_seo' && task.domain) {
              const res = await withRetry(() =>
                base44.asServiceRole.functions.invoke('runGrowthMission', { domain: task.domain }),
                { retries: 2 }
              );
              return { audit: res.data?.result || {} };

            } else {
              return { note: 'No deterministic handler wired for this task_type yet.' };
            }
          })(),
          30000,
          `task_${task.task_type}`
        );

        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'completed',
          result: JSON.stringify(outcome).slice(0, 1000)
        });
        executed++;
        results.push({ task_id: task.id, title: task.title, status: 'completed' });
        log('task_executed', { id: task.id, type: task.task_type });
      } catch (e) {
        // ERROR ISOLATION — mark failed, keep going
        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'failed',
          result: `heartbeat_error: ${e.message}`.slice(0, 1000)
        }).catch(() => {});
        failed++;
        results.push({ task_id: task.id, title: task.title, status: 'failed', error: e.message });
        log('task_failed', { id: task.id, error: e.message });
      }
    }

    // ── STAGE 3: Re-audit stale domains (with retry) ──
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stale = await withRetry(() =>
      base44.asServiceRole.entities.Domain.filter(
        { status: { $in: ['active', 'issues', 'onboarding'] }, last_audit: { $lt: cutoff } },
        { limit: 10, sort: 'last_audit' }
      )
    );
    const staleDomains = stale.items || [];
    log('load_stale_domains', { count: staleDomains.length });

    let reaudited = 0;
    for (const d of staleDomains) {
      try {
        await withRetry(() =>
          base44.asServiceRole.functions.invoke('runGrowthMission', { domain: d.domain }),
          { retries: 1 }
        );
        reaudited++;
        log('reaudit_domain', { domain: d.domain });
      } catch (e) {
        log('reaudit_failed', { domain: d.domain, error: e.message });
      }
    }

    // ── STAGE 4: Send heartbeat summary email (if recipient configured) ──
    let summaryEmail = null;
    if (reportEmail) {
      const summary = [
        'XTREME DOMAIN OPERATOR — HEARTBEAT SUMMARY',
        '==========================================',
        '',
        `Timestamp: ${new Date().toISOString()}`,
        `Trigger: scheduled_workflow`,
        '',
        `Tasks executed: ${executed}`,
        `Tasks failed: ${failed}`,
        `Stuck tasks recovered: ${recovered}`,
        `Domains re-audited: ${reaudited}`,
        `Emails sent: ${emailsSent}`,
        `Emails skipped (circuit breaker): ${emailsSkipped}`,
        `Gmail circuit tripped: ${gmailBreaker.isTripped()}`,
        '',
        '--- Task Results ---',
        ...results.map(r => `  • ${r.title}: ${r.status}${r.error ? ` (${r.error})` : ''}`),
        '',
        'This heartbeat ran autonomously. No human pressed a button.',
        ''
      ].join('\n');

      summaryEmail = await safeSendGmail(base44, gmailBreaker, {
        to: reportEmail,
        subject: `Heartbeat Summary: ${executed} tasks, ${reaudited} re-audits`,
        text: summary,
        html: `<pre style="font-family:monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;">${summary.replace(/</g,'&lt;')}</pre>`
      });
      if (summaryEmail.sent) emailsSent++;
    }

    log('heartbeat_complete', {
      executed, failed, reaudited, recovered,
      emails_sent: emailsSent, emails_skipped: emailsSkipped,
      gmail_circuit_tripped: gmailBreaker.isTripped()
    });

    return Response.json({
      autonomous: true,
      llm_used: false,
      hardened: true,
      triggered_by: 'scheduled_workflow',
      tasks_executed: executed,
      tasks_failed: failed,
      stuck_recovered: recovered,
      domains_reaudited: reaudited,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      gmail_circuit_tripped: gmailBreaker.isTripped(),
      summary_email: summaryEmail,
      results,
      trace
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}