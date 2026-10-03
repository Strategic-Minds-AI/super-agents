import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

const ssl = config.dbSsl === 'require'
  ? { rejectUnauthorized: false }
  : false;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl,
  max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDb() {
  await pool.end();
}
