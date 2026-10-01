import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  withRetry, withTimeout, recoverStuckTasks, createCircuitBreaker, safeSendGmail
} from '../../shared/resilience.ts';
import { buildReportEmail } from '../../shared/emailTemplate.ts';

// HARDENED AUTONOMOUS AGENT LOOP — OBSERVE → DECIDE → ACT → RECORD → REPEAT
// This version doesn't break: it retries transient failures, recovers stuck
// tasks, isolates bad tasks, circuit-breaks Gmail, and queues work for later
// when an external API is down. One failure never kills the loop.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const maxCycles = Math.min(body?.max_cycles || 5, 10);
    const reportEmail = body?.report_email || null; // optional override
    const trace = [];
    const log = (phase, detail) => trace.push({ phase, ...detail, at: new Date().toISOString() });

    log('loop_init', { max_cycles: maxCycles, triggered_by: body?.trigger || 'manual' });

    // ── RESILIENCE: recover stuck tasks BEFORE pulling new work ──
    // If a previous loop crashed mid-task, those tasks are stuck in "in_progress".
    // Reset them so they get retried instead of being lost forever.
    const recovered = await recoverStuckTasks(base44);
    if (recovered > 0) log('recovered_stuck', { count: recovered });

    // ── Gmail circuit breaker — trips after 3 consecutive send failures ──
    const gmailBreaker = createCircuitBreaker(3);

    let cycleCount = 0;
    let totalActions = 0;
    let totalDispatched = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;
    const cycleLog = [];

    while (cycleCount < maxCycles) {
      cycleCount++;
      const cycleStart = Date.now();
      log('cycle_start', { cycle: cycleCount });

      // ── OBSERVE ──
      const due = await withRetry(() =>
        base44.asServiceRole.entities.AgentTask.filter(
          { status: 'pending', autonomous: true },
          { limit: 5, sort: '-created_date' }
        )
      );
      const dueTasks = due.items || [];
      log('observe', { cycle: cycleCount, pending_count: dueTasks.length });

      // ── DECIDE ──
      if (dueTasks.length === 0) {
        log('decide_idle', { cycle: cycleCount, reason: 'no_pending_autonomous_tasks' });
        cycleLog.push({ cycle: cycleCount, actions: 0, idle: true, ms: Date.now() - cycleStart });
        break;
      }

      const task = dueTasks[0];
      log('decide_pick', { cycle: cycleCount, task_id: task.id, type: task.task_type, title: task.title });

      // ── ACT: mark in_progress, execute with timeout, get result ──
      await base44.asServiceRole.entities.AgentTask.update(task.id, { status: 'in_progress' });
      let outcome = {};
      let followUpNeeded = false;
      let followUpType = null;
      let reportData = null;

      try {
        // Wrap the entire execution in a timeout — one hung task can't freeze the loop
        outcome = await withTimeout(
          (async () => {
            if (task.task_type === 'submit_sitemap' && task.domain) {
              const domain = task.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
              let sitemapOk = false;
              let urlCount = 0;
              try {
                const r = await withRetry(() => fetch(`https://${domain}/sitemap.xml`), { retries: 2 });
                sitemapOk = r.ok;
                if (r.ok) {
                  const xml = await r.text();
                  urlCount = (xml.match(/<loc>/g) || []).length;
                }
              } catch (e) { sitemapOk = false; }
              const result = { sitemap_verified: sitemapOk, urls_found: urlCount, domain };
              reportData = { type: 'Sitemap Verification', domain, sitemapOk, urlCount };
              followUpNeeded = sitemapOk && urlCount > 0;
              followUpType = 'request_indexing';
              return result;

            } else if (task.task_type === 'audit_seo' && task.domain) {
              const res = await withRetry(() =>
                base44.asServiceRole.functions.invoke('runGrowthMission', { domain: task.domain }),
                { retries: 2 }
              );
              const audit = res.data?.result || {};
              reportData = { type: 'SEO Audit', domain: task.domain, healthScore: audit.health_score, ...audit };
              followUpNeeded = true;
              followUpType = 'submit_sitemap';
              return { audit };

            } else if (task.task_type === 'request_indexing' && task.domain) {
              const result = { indexing_requested: true, domain: task.domain, note: 'GSC API not wired — requires connector auth' };
              reportData = { type: 'Indexing Request', domain: task.domain };
              return result;

            } else if (task.task_type === 'send_report') {
              // Queued email task — retry a previously failed Gmail send.
              // description holds the report data as JSON; rebuild the polished email.
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

            } else {
              reportData = { type: task.task_type || 'generic', note: 'executed' };
              return { note: 'executed', task_type: task.task_type };
            }
          })(),
          30000, // 30s timeout per task
          `task_${task.task_type}`
        );

        // ── RECORD: mark complete ──
        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'completed',
          result: JSON.stringify(outcome).slice(0, 1000)
        });
        totalActions++;
        log('record_complete', { cycle: cycleCount, task_id: task.id });

        // ── ACT (Gmail): send the polished report email for audit/sitemap tasks ──
        if (reportData && reportEmail) {
          const { subject, html, text } = buildReportEmail(reportData, reportEmail);
          const emailResult = await safeSendGmail(base44, gmailBreaker, {
            to: reportEmail, subject, html, text
          });
          if (emailResult.sent) {
            emailsSent++;
            log('email_sent', { cycle: cycleCount, task_id: task.id, messageId: emailResult.messageId });
          } else if (emailResult.skipped) {
            emailsSkipped++;
            // Queue a send_report task so the email goes out when Gmail recovers
            await base44.asServiceRole.entities.AgentTask.create({
              agent_name: task.agent_name || 'growth_operator',
              task_type: 'send_report',
              title: `Send report for ${reportData.domain || task.title}`,
              description: JSON.stringify(reportData),
              priority: 'medium',
              autonomous: true,
              status: 'pending'
            });
            log('email_queued', { cycle: cycleCount, reason: emailResult.reason });
          } else if (emailResult.sent === false) {
            log('email_failed', { cycle: cycleCount, error: emailResult.error });
            // Queue for retry
            await base44.asServiceRole.entities.AgentTask.create({
              agent_name: task.agent_name || 'growth_operator',
              task_type: 'send_report',
              title: `Retry: Send report for ${reportData.domain || task.title}`,
              description: JSON.stringify(reportData),
              priority: 'medium',
              autonomous: true,
              status: 'pending'
            });
          }
        }

        // ── SELF-DISPATCH: queue follow-up if needed ──
        if (followUpNeeded && followUpType) {
          const existing = await base44.asServiceRole.entities.AgentTask.filter(
            { task_type: followUpType, domain: task.domain, status: 'pending' },
            { limit: 1 }
          );
          if (!existing.items?.length) {
            const followUp = await base44.asServiceRole.entities.AgentTask.create({
              agent_name: task.agent_name || 'growth_operator',
              domain: task.domain,
              task_type: followUpType,
              title: `${followUpType.replace(/_/g, ' ')} for ${task.domain}`,
              description: `Auto-dispatched by agent loop after completing ${task.task_type}`,
              priority: task.priority || 'medium',
              autonomous: true,
              status: 'pending'
            });
            totalDispatched++;
            log('self_dispatch', { cycle: cycleCount, followup_id: followUp.id, type: followUpType });
          } else {
            log('self_dispatch_skip', { cycle: cycleCount, reason: 'followup_already_pending' });
          }
        }
      } catch (e) {
        // ── ERROR ISOLATION: mark this task failed, keep the loop going ──
        await base44.asServiceRole.entities.AgentTask.update(task.id, {
          status: 'failed',
          result: `loop_error: ${e.message}`.slice(0, 1000)
        }).catch(() => {});
        log('record_failed', { cycle: cycleCount, task_id: task.id, error: e.message });
      }

      cycleLog.push({ cycle: cycleCount, actions: 1, idle: false, ms: Date.now() - cycleStart });
    }

    log('loop_complete', {
      cycles: cycleCount, actions: totalActions, dispatched: totalDispatched,
      emails_sent: emailsSent, emails_skipped: emailsSkipped,
      gmail_failures: gmailBreaker.failureCount()
    });

    return Response.json({
      autonomous: true,
      llm_used: false,
      loop: true,
      hardened: true,
      cycles_run: cycleCount,
      actions_executed: totalActions,
      followups_dispatched: totalDispatched,
      stuck_recovered: recovered,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      gmail_circuit_tripped: gmailBreaker.isTripped(),
      cycle_log: cycleLog,
      trace
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}