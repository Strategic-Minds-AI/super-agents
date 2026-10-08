import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { pool, withTransaction } from './db.js';
import { assertRuntimeConfig } from './config.js';

assertRuntimeConfig();

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../migrations');

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const files = (await readdir(migrationsDir))
  .filter(name => name.endsWith('.sql'))
  .sort();

for (const name of files) {
  const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  if (exists.rowCount) continue;

  const sql = await readFile(resolve(migrationsDir, name), 'utf8');
  await withTransaction(async client => {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
  });
  console.log(`migration_applied name=${name}`);
}

await pool.end();
