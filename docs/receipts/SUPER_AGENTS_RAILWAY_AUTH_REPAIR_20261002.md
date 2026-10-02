# SUPER AGENTS Railway Auth Repair Receipt — 2026-10-02

## Scope
Metadata-only receipt. No credential values are stored.

## Approved secret operation
- Approval: `APPROVE SUPER AGENTS WORKER SECRET BINDING`
- Base44 app: `SUPER AGENTS` / `6abe230b2d09558c618be440`
- Railway project: `Strategic Sandbox System` / `15f90272-e2f6-4739-8286-91447f545d71`
- Secret alias: `WORKER_SECRET`
- Consumers: orchestrator, growth, code, social, sales, brand, replicator, swarm sandbox services only
- Production and staging Railway environments excluded

## Verified
- One fresh WORKER_SECRET was bound write-only to Base44 and all eight sandbox lane services.
- Secret values were never emitted to chat, Git, receipts, or logs.
- Railway metadata confirms WORKER_SECRET exists on all eight lane services.
- Base44 metadata confirms WORKER_SECRET exists.
- Base44 public app bundle maps `super-agents-zero.base44.app` to app id `6abe230b2d09558c618be440`.
- Current Base44 deployed `runAgentLoop` source is byte-for-byte identical to current repo source at main `55ea92a8f935372f78f1fa97090dd7fe2bc22c02`.
- `secrets.get()` is synchronous in the installed Base44 runtime.
- Orchestrator main deployment after rollback: `2610c89a-2c3f-4921-9e99-a4095c1dc5bb` — SUCCESS.
- Distressed Deals worker is independently healthy; this receipt does not modify it.

## Failed canary evidence
- Canary branch: `apex/railway-preview-auth-canary-20261002`
- Initial canary commit: `2b830ecfb74a13e28e840bdf36a1f59f013c4dad`
- Canary deployment: `32611a67-d07a-4391-a4c9-5579673e5a6d`
- Canary mode used `Base44-Functions-Version: preview`.
- Result: HTTP 500, `Authentication required to view users`.
- Therefore the worker-auth bypass did not match the Base44 runtime secret.

## Queue safety gate
Read-only queue audit found 30 pending autonomous AgentTask records:
- 6 build_system
- 6 google_connect
- 6 social_connect
- 6 content_optimize
- 3 submit_sitemap
- 2 request_indexing
- 1 audit_seo

Targets include test/example domains plus notion.so, linear.app, stripe.com, smileco.com, dentalpro.com, and brightsmile.com. No broad worker activation should occur until this queue is explicitly classified/quarantined.

## Staged branch repair
Branch is 3 commits ahead of main and modifies only:
- `base44/functions/runAgentLoop/entry.ts`
- `local-worker/worker.js`

Repair adds:
- dual Base44 secret lookup: `secrets.get('WORKER_SECRET')` plus `Deno.env.get('WORKER_SECRET')` fallback;
- a side-effect-free `auth_probe` response containing booleans only;
- Railway canary mode that invokes only the auth probe and never dequeues tasks.

Latest branch commit after probe changes:
- function patch: `a70ca96fe4f296cdbe7e0e4d7075964cb0669163`
- worker patch: `ab152fa06e3a049cc632c3c14d3609b3798fb459`

## Current blocker
The auth-probe function patch is not deployed to Base44 runtime. Base44 function deployment is a production backend mutation and is not covered by the prior secret-binding approval.

## Next protected action
Deploy only `runAgentLoop` from the validated canary branch to Base44, then run the no-task auth probe from sandbox-orchestrator.

Exact approval phrase:
`APPROVE BASE44 PRODUCTION FUNCTION DEPLOY: runAgentLoop AUTH PROBE ONLY`

## Rollback
- Preserve current function package before deployment via Base44 pull/checkpoint.
- If the post-deploy auth probe fails, redeploy the preserved prior `runAgentLoop` package and keep all eight agent lanes gated.
- Do not roll the other seven lanes until the canary passes.
