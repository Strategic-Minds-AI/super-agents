# Repo-Native Super Agents Runtime

## Authority

- Canonical code: `Strategic-Minds-AI/super-agents`
- Runtime code: `runtime/`
- Canonical agent definitions: `agents/`
- Worker container: `local-worker/`
- Durable queue/state: PostgreSQL-compatible database
- Local persistent runtime: Docker Compose
- Cloud persistent runtime: Railway
- Model execution: OpenAI Responses API
- Legacy donor only: `base44/`

Base44 is not in the repo-native execution path.

## Runtime flow

```text
Task -> Postgres queue -> lane worker -> runtime API
     -> lease/claim -> governance gate
     -> deterministic handler OR Super Agent model
     -> durable run receipt -> task result
```

Eight workers run independently:

1. orchestrator
2. growth_operator
3. code_architect
4. social_strategist
5. sales_engine
6. brand_guardian
7. replicator
8. swarm

## Concurrency

Task claiming uses `FOR UPDATE SKIP LOCKED`. This allows multiple workers to poll the same queue safely without double-claiming a task.

Each task receives:
- lease owner
- lease expiration
- attempt count
- max attempts
- durable run receipt

Expired leases are reclaimed automatically. Exhausted retries become terminal failures.

## Governance

The runtime independently enforces a protected task-type list. A protected task is moved to `needs_approval` even when a producer incorrectly marks it `autonomous=true`.

Protected examples:
- domain purchases
- DNS changes
- production deploys
- default-branch merges
- outbound email/SMS
- live social publishing
- Google mutations/indexing
- credential/permission changes
- payments/spend

## Model execution

The runtime uses the OpenAI Responses API.

Server-only environment:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`

The default model is intentionally configurable. No model credential is stored in Git.

## Database targets

The same runtime can use:
- Docker Postgres locally
- Railway Postgres
- Supabase Postgres

Only `DATABASE_URL` and optional `DB_SSL=require` change.

## Local start

```powershell
.\scripts\docker-up.ps1
```

Then:

```text
GET http://127.0.0.1:8080/health
```

The Postgres named volume `super_agents_pgdata` survives container restarts and normal `docker compose down`.

## Destructive local reset

Only when intentionally resetting all local state:

```powershell
docker compose down -v
```

This deletes the persistent local database volume.
