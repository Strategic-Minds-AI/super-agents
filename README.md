# Strategic Minds Super Agents

Canonical repository for the Strategic Minds eight-agent runtime.

## Current architecture

The repo-native runtime does **not** require Base44.

```text
GitHub source
    |
    +-- agents/                canonical agent definitions
    +-- runtime/               queue + API + agent execution
    +-- local-worker/          stateless worker container
    +-- docker-compose.yml     local persistent eight-agent stack
    |
PostgreSQL <-> Runtime API <-> 8 lane workers
                     |
               OpenAI Responses API
```

### Agent fleet

1. orchestrator
2. growth_operator
3. code_architect
4. social_strategist
5. sales_engine
6. brand_guardian
7. replicator
8. swarm

## Local persistent Docker runtime

Prerequisites:
- Docker Desktop / Docker Engine
- PowerShell on Windows

Start:

```powershell
.\scripts\docker-up.ps1
```

The first run creates a local `.env` with random Postgres/runtime credentials.

Add your server-side `OPENAI_API_KEY` to `.env` before allowing model-backed tasks.

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

Stop without deleting state:

```powershell
.\scripts\docker-down.ps1
```

The named Postgres volume persists across restarts.

## Durable governance

Workers claim only:
- their exact `AGENT_NAME`
- `status=pending`
- `autonomous=true`

Task claiming uses Postgres row locking to prevent double execution.

The runtime independently blocks protected actions such as:
- domain purchases
- DNS changes
- production deployments
- default-branch merges
- outbound email/SMS
- live social publishing
- Google mutations/indexing
- credential/permission changes
- payments

Protected work becomes `needs_approval` even if an upstream producer incorrectly marks it autonomous.

## Railway

The same runtime can run continuously in Railway.

Recommended topology:
- 1 runtime API service
- 8 worker services
- PostgreSQL/Supabase Postgres

See `docs/architecture/RAILWAY_REPO_NATIVE.md`.

## Database

The runtime uses standard PostgreSQL and can target:
- Docker Postgres
- Railway Postgres
- Supabase Postgres

Migrations live in `runtime/migrations/`.

## OpenAI

Model execution uses the OpenAI Responses API.

Required server-only variable:

```text
OPENAI_API_KEY
```

Optional:

```text
OPENAI_MODEL=gpt-6-luna
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Legacy donor code

The `base44/` directory remains in the repository only as legacy/donor source while repo-native migration is completed. It is **not** required by the repo-native Docker runtime.

Do not publish or mutate Base44 as part of the repo-native runtime workflow.

## Validation

Repo-native CI boots PostgreSQL + the runtime and proves:
- migrations apply
- runtime health succeeds
- all eight agents load
- unauthorized worker calls fail
- protected tasks fail closed to `needs_approval`

See `.github/workflows/repo-native-runtime-ci.yml`.
