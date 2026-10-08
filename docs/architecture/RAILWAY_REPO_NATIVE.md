# Railway Repo-Native Deployment

## Target topology

Use one shared runtime API service plus eight worker services.

### Runtime API

Build:
- root context: repository root
- Dockerfile: `runtime/Dockerfile`

Required variables:
- `DATABASE_URL`
- `RUNTIME_TOKEN`
- `OPENAI_API_KEY`

Recommended:
- `DB_SSL=require` for hosted Postgres/Supabase when required
- `OPENAI_MODEL=gpt-6-luna`
- `SOURCE_SHA=<exact Git SHA>`

### Worker services

Root directory:
- `/local-worker`

Each lane requires:
- `RUNTIME_URL=<runtime internal/public URL>`
- `RUNTIME_TOKEN=<same internal token>`
- `AGENT_NAME=<lane>`
- `RUNTIME_KIND=railway`

No Base44 URL or Base44 worker secret is required.

## Migration rule

Do not switch the existing eight Railway lanes until:
1. repo-native Docker integration CI passes;
2. runtime DB migration is validated;
3. target Postgres/Supabase database is explicitly selected;
4. runtime secrets are approved and bound;
5. one orchestrator canary passes;
6. queue state is migrated or deliberately started clean.

Those provider writes remain protected.
