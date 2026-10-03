# Super Agents Worker

This worker is a lightweight scheduler/consumer for the repo-native Super Agents runtime.

It does **not** call Base44.

## Required variables

- `RUNTIME_URL` — runtime API base URL
- `RUNTIME_TOKEN` — shared internal runtime bearer token
- `AGENT_NAME` — one of the eight repo-native agent names

Optional:

- `WORKER_ID`
- `POLL_INTERVAL` (default 60000 ms)
- `MAX_CYCLES` (default 5)
- `RUNTIME_KIND` (docker or railway)

## Docker

The root `docker-compose.yml` launches:
- PostgreSQL
- one runtime API
- all eight agent workers

The runtime owns queue locking and durable receipts. Workers are intentionally stateless.

## Railway

Create one runtime API service plus one worker service per lane. Point every worker at the same runtime URL and durable Postgres database.

Do not configure Base44 URLs or Base44 worker secrets on the repo-native branch.
