import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

function env(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function intEnv(name, fallback) {
  const value = Number.parseInt(env(name, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

export const config = Object.freeze({
  port: intEnv('PORT', 8080),
  databaseUrl: env('DATABASE_URL'),
  dbSsl: env('DB_SSL', 'disable'),
  runtimeToken: env('RUNTIME_TOKEN'),
  openaiApiKey: env('OPENAI_API_KEY'),
  openaiBaseUrl: env('OPENAI_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, ''),
  openaiModel: env('OPENAI_MODEL', 'gpt-6-luna'),
  agentConfigDir: env('AGENT_CONFIG_DIR', resolve(here, '../../agents')),
  sourceSha: env('SOURCE_SHA', 'local'),
  leaseSeconds: intEnv('LEASE_SECONDS', 300),
  taskTimeoutMs: intEnv('TASK_TIMEOUT_MS', 45000),
  maxCyclesCap: intEnv('MAX_CYCLES_CAP', 10),
});

export function assertRuntimeConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.runtimeToken) missing.push('RUNTIME_TOKEN');
  if (missing.length) {
    throw new Error(`Missing required runtime configuration: ${missing.join(', ')}`);
  }
}
