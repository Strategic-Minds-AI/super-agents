#!/usr/bin/env node
// Strategic Minds Railway autonomous worker.
// Authenticates to Base44 with per-lane ECDSA P-256 request signatures.

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  createHash,
  createPrivateKey,
  randomUUID,
  sign as cryptoSign,
} from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const APP_URL = (process.env.APP_URL || 'https://super-agents-zero.base44.app').replace(/\/$/, '');
const AGENT_NAME = (process.env.AGENT_NAME || '').trim();
const WORKER_KEY_ID = (process.env.WORKER_KEY_ID || '').trim();
const WORKER_PRIVATE_KEY_PKCS8_B64 = (process.env.WORKER_PRIVATE_KEY_PKCS8_B64 || '').trim();
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '60000', 10);
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '5', 10);
const REPORT_EMAIL = process.env.REPORT_EMAIL || '';
const AUTH_CANARY = process.env.AUTH_CANARY === '1';
const LOG_FILE = process.env.LOG_FILE || join(__dirname, 'worker.log');
const AUTH_VERSION = 'sma-v1';

if (!AGENT_NAME || !WORKER_KEY_ID || !WORKER_PRIVATE_KEY_PKCS8_B64) {
  console.error('Missing AGENT_NAME, WORKER_KEY_ID, or WORKER_PRIVATE_KEY_PKCS8_B64.');
  process.exit(1);
}

let privateKey;
try {
  privateKey = createPrivateKey({
    key: Buffer.from(WORKER_PRIVATE_KEY_PKCS8_B64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
} catch {
  console.error('WORKER_PRIVATE_KEY_PKCS8_B64 is not a valid PKCS#8 private key.');
  process.exit(1);
}

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
};

const stats = {
  startTime: Date.now(),
  totalRuns: 0,
  totalActions: 0,
  totalDispatched: 0,
  totalEmails: 0,
  totalErrors: 0,
  lastRun: null,
  running: false,
};

function log(msg, color = '') {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(`${color}${msg}${c.reset}`);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function banner() {
  console.log(`${c.bold}
Strategic Minds Railway Worker
${c.reset}${c.dim}  App:        ${APP_URL}
  Agent lane:  ${AGENT_NAME}
  Key id:      ${WORKER_KEY_ID}
  Interval:    ${POLL_INTERVAL}ms
  Max cycles:  ${MAX_CYCLES}
  Mode:        ${AUTH_CANARY ? 'auth_canary' : 'agent_loop'}
  Log file:    ${LOG_FILE}${c.reset}
`);
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

function signedHeaders(body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const bodyHash = sha256Hex(body);
  const signingInput = [
    AUTH_VERSION,
    WORKER_KEY_ID,
    timestamp,
    nonce,
    bodyHash,
  ].join('\n');

  const signature = cryptoSign(
    'sha256',
    Buffer.from(signingInput, 'utf8'),
    { key: privateKey, dsaEncoding: 'ieee-p1363' },
  ).toString('base64url');

  return {
    'Content-Type': 'application/json',
    'X-SMA-Auth-Version': AUTH_VERSION,
    'X-SMA-Key-Id': WORKER_KEY_ID,
    'X-SMA-Timestamp': timestamp,
    'X-SMA-Nonce': nonce,
    'X-SMA-Signature': signature,
  };
}

async function postSigned(payload) {
  const body = JSON.stringify(payload);
  return fetch(`${APP_URL}/functions/runAgentLoop`, {
    method: 'POST',
    headers: signedHeaders(body),
    body,
  });
}

async function runAuthCanary() {
  try {
    const res = await postSigned({ auth_probe: true, agent_name: AGENT_NAME });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 200 && data.worker_auth === true;
    if (pass) {
      log(`AUTH_CANARY_PASS key=${data.key_id || WORKER_KEY_ID}`, c.green);
      return true;
    }
    log(`AUTH_CANARY_FAIL HTTP ${res.status} reason=${data.reason || 'unknown'}`, c.red);
    return false;
  } catch (e) {
    log(`AUTH_CANARY_ERROR ${e.message}`, c.red);
    return false;
  }
}

async function runOnce() {
  if (stats.running) return;
  stats.running = true;
  stats.totalRuns++;

  const payload = {
    max_cycles: MAX_CYCLES,
    agent_name: AGENT_NAME,
    trigger: 'railway_worker',
  };
  if (REPORT_EMAIL) payload.report_email = REPORT_EMAIL;

  try {
    const res = await postSigned(payload);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    if (data.error) {
      stats.totalErrors++;
      log(`Loop error: ${data.error}`, c.red);
    } else {
      stats.totalActions += data.actions_executed || 0;
      stats.totalDispatched += data.followups_dispatched || 0;
      stats.totalEmails += data.emails_sent || 0;
      stats.lastRun = { at: new Date().toISOString(), ...data };
      if (data.actions_executed > 0) {
        log(
          `Run #${stats.totalRuns}: ${data.actions_executed} actions · ${data.followups_dispatched || 0} dispatched · ${data.emails_sent || 0} emails`,
          c.green,
        );
      } else {
        log(`Run #${stats.totalRuns}: idle`, c.dim);
      }
    }
  } catch (e) {
    stats.totalErrors++;
    log(`Fetch failed: ${e.message}`, c.red);
  } finally {
    stats.running = false;
  }
}

function showStats() {
  const up = Math.floor((Date.now() - stats.startTime) / 1000);
  console.log(`${c.cyan}Worker stats: uptime=${up}s runs=${stats.totalRuns} actions=${stats.totalActions} errors=${stats.totalErrors}${c.reset}`);
}

banner();
log('Worker started.', c.bold);

let intervalId;
let statsIntervalId;

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
  log(`${signal} received. Shutting down gracefully...`, c.yellow);
  if (intervalId) clearInterval(intervalId);
  if (statsIntervalId) clearInterval(statsIntervalId);
  showStats();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch(e => {
  log(`Fatal: ${e.message}`, c.red);
  process.exit(1);
});
