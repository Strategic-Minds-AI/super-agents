#!/usr/bin/env node
import { appendFileSync } from 'fs';
import { hostname } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RUNTIME_URL = (process.env.RUNTIME_URL || 'http://runtime:8080').replace(/\/$/, '');
const RUNTIME_TOKEN = process.env.RUNTIME_TOKEN || '';
const AGENT_NAME = (process.env.AGENT_NAME || '').trim();
const WORKER_ID = (process.env.WORKER_ID || `${AGENT_NAME || 'worker'}-${hostname()}`).trim();
const POLL_INTERVAL = Number.parseInt(process.env.POLL_INTERVAL || '60000', 10);
const MAX_CYCLES = Number.parseInt(process.env.MAX_CYCLES || '5', 10);
const LOG_FILE = process.env.LOG_FILE || join(__dirname, 'worker.log');

if (!RUNTIME_TOKEN || !AGENT_NAME) {
  console.error('RUNTIME_TOKEN and AGENT_NAME are required.');
  process.exit(1);
}

let running = false;
let runCount = 0;
let actionCount = 0;
let errorCount = 0;

function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

async function runOnce() {
  if (running) return;
  running = true;
  runCount++;

  try {
    const response = await fetch(`${RUNTIME_URL}/v1/run-once`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNTIME_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: AGENT_NAME,
        worker_id: WORKER_ID,
        max_cycles: MAX_CYCLES,
        runtime: process.env.RUNTIME_KIND || 'docker',
      }),
    });

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}

    if (!response.ok) {
      throw new Error(data.error || raw.slice(0, 300) || `HTTP ${response.status}`);
    }

    const actions = Array.isArray(data.actions) ? data.actions : [];
    actionCount += actions.length;

    if (actions.length) {
      log(`run=${runCount} agent=${AGENT_NAME} actions=${actions.length} recovered=${data.recovered_leases || 0}`);
    } else {
      log(`run=${runCount} agent=${AGENT_NAME} idle=true`);
    }
  } catch (error) {
    errorCount++;
    log(`run=${runCount} agent=${AGENT_NAME} error=${String(error?.message || error).slice(0, 500)}`);
  } finally {
    running = false;
  }
}

function stats() {
  log(`stats runs=${runCount} actions=${actionCount} errors=${errorCount}`);
}

log(`worker_started agent=${AGENT_NAME} worker_id=${WORKER_ID} runtime_url=${RUNTIME_URL}`);
await runOnce();

const poll = setInterval(runOnce, POLL_INTERVAL);
const report = setInterval(stats, 5 * 60 * 1000);

function shutdown(signal) {
  clearInterval(poll);
  clearInterval(report);
  log(`worker_stopping signal=${signal}`);
  stats();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
