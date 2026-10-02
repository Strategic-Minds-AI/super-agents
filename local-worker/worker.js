#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  XTREME DOMAIN OPERATOR — LOCAL AUTONOMOUS WORKER
//  Runs the hardened agent loop continuously on your machine.
//  Same code deploys to Railway for 24/7 uptime when your laptop sleeps.
//  Zero dependencies — pure Node.js 20+.
// ════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env if it exists (so `node worker.js` works without --env-file) ──
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ── Config ──
const APP_URL = (process.env.APP_URL || 'https://super-agents-zero.base44.app').replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_SECRET;
const AGENT_NAME = (process.env.AGENT_NAME || '').trim();
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '60000', 10);
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '5', 10);
const REPORT_EMAIL = process.env.REPORT_EMAIL || '';
const FUNCTIONS_VERSION = (process.env.BASE44_FUNCTIONS_VERSION || '').trim();
const AUTH_CANARY = process.env.AUTH_CANARY === '1';
const LOG_FILE = process.env.LOG_FILE || join(__dirname, 'worker.log');

if (!WORKER_SECRET) {
  console.error('\x1b[31m❌ WORKER_SECRET not set. Copy .env.example to .env and fill it in.\x1b[0m');
  process.exit(1);
}

// ── ANSI colors ──
const c = {
  reset: '\x1b[0m', gold: '\x1b[38;5;226m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[2m', bold: '\x1b[1m',
};

// ── Stats ──
const stats = {
  startTime: Date.now(),
  totalRuns: 0, totalActions: 0, totalDispatched: 0,
  totalEmails: 0, totalErrors: 0, lastRun: null, running: false,
};

// ── Logging ──
function log(msg, color = '') {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(`${color}${msg}${c.reset}`);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function banner() {
  console.log(`${c.bold}${c.gold}
  ╔═══════════════════════════════════════════════════════════╗
  ║   XTREME DOMAIN OPERATOR — LOCAL AUTONOMOUS WORKER          ║
  ╚═══════════════════════════════════════════════════════════╝${c.reset}
${c.dim}  App:        ${APP_URL}
  Interval:   ${POLL_INTERVAL}ms (${POLL_INTERVAL / 1000}s)
  Max cycles: ${MAX_CYCLES}
  Agent lane:  ${AGENT_NAME || '(global)'}
  Report to:  ${REPORT_EMAIL || '(none)'}
  Functions:  ${FUNCTIONS_VERSION || '(default)'}
  Mode:       ${AUTH_CANARY ? 'auth_canary' : 'agent_loop'}
  Log file:   ${LOG_FILE}${c.reset}
`);
}

function requestHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (FUNCTIONS_VERSION) headers['Base44-Functions-Version'] = FUNCTIONS_VERSION;
  return headers;
}

async function runAuthCanary() {
  try {
    const res = await fetch(`${APP_URL}/functions/runDomainBuyer`, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify({ worker_secret: WORKER_SECRET }),
    });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 400 && data.error === 'domain required';
    if (pass) {
      log(`✓ AUTH_CANARY_PASS · functions=${FUNCTIONS_VERSION || 'default'}`, c.green);
      return true;
    }
    log(`✗ AUTH_CANARY_FAIL · HTTP ${res.status} · ${String(data.error || 'unexpected_response').slice(0, 160)}`, c.red);
    return false;
  } catch (e) {
    log(`✗ AUTH_CANARY_ERROR · ${e.message}`, c.red);
    return false;
  }
}

// ── Single agent-loop invocation ──
async function runOnce() {
  if (stats.running) return;
  stats.running = true;
  stats.totalRuns++;

  const payload = {
    worker_secret: WORKER_SECRET,
    max_cycles: MAX_CYCLES,
    agent_name: AGENT_NAME || undefined,
    trigger: 'railway_worker',
  };
  if (REPORT_EMAIL) payload.report_email = REPORT_EMAIL;

  try {
    const res = await fetch(`${APP_URL}/functions/runAgentLoop`, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();

    if (data.error) {
      stats.totalErrors++;
      log(`✗ Loop error: ${data.error}`, c.red);
    } else {
      stats.totalActions += data.actions_executed || 0;
      stats.totalDispatched += data.followups_dispatched || 0;
      stats.totalEmails += data.emails_sent || 0;
      stats.lastRun = { at: new Date().toISOString(), ...data };

      if (data.actions_executed > 0) {
        log(`✓ Run #${stats.totalRuns}: ${data.actions_executed} actions · ${data.followups_dispatched || 0} dispatched · ${data.emails_sent || 0} emails · ${data.stuck_recovered || 0} recovered`, c.green);
      } else {
        log(`○ Run #${stats.totalRuns}: idle (no pending autonomous tasks)`, c.dim);
      }
    }
  } catch (e) {
    stats.totalErrors++;
    log(`✗ Fetch failed: ${e.message}`, c.red);
  } finally {
    stats.running = false;
  }
}

// ── Status display ──
function showStats() {
  const up = Math.floor((Date.now() - stats.startTime) / 1000);
  const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;
  console.log(`${c.cyan}─── Worker Stats ───────────────────${c.reset}`);
  console.log(`  Uptime:      ${h}h ${m}m ${s}s`);
  console.log(`  Total runs:  ${stats.totalRuns}`);
  console.log(`  Actions:     ${stats.totalActions}`);
  console.log(`  Dispatched:  ${stats.totalDispatched}`);
  console.log(`  Emails sent: ${stats.totalEmails}`);
  console.log(`  Errors:      ${stats.totalErrors}`);
  if (stats.lastRun) console.log(`  Last run:    ${stats.lastRun.at}`);
  console.log(`${c.cyan}────────────────────────────────────${c.reset}`);
}

// ── Main ──
banner();
log('Worker started. Press Ctrl+C to stop. Running autonomously.', c.bold);

let intervalId, statsIntervalId;

async function main() {
  if (AUTH_CANARY) {
    const ok = await runAuthCanary();
    if (!ok) process.exit(1);
    intervalId = setInterval(async () => {
      const stillOk = await runAuthCanary();
      if (!stillOk) process.exit(1);
    }, POLL_INTERVAL);
    return;
  }
  await runOnce();
  intervalId = setInterval(runOnce, POLL_INTERVAL);
  statsIntervalId = setInterval(showStats, 5 * 60 * 1000);
}

function shutdown(signal) {
  log(`\n${signal} received. Shutting down gracefully...`, c.yellow);
  if (intervalId) clearInterval(intervalId);
  if (statsIntervalId) clearInterval(statsIntervalId);
  showStats();
  log('Worker stopped.', c.bold);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch(e => { log(`Fatal: ${e.message}`, c.red); process.exit(1); });