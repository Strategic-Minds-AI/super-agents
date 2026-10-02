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


## Production auth-probe execution — 2026-10-02

Approval received:
`APPROVE BASE44 PRODUCTION FUNCTION DEPLOY: runAgentLoop AUTH PROBE ONLY`

### Execution evidence
- Base44 pre-release checkpoint: `6ac03f7cf6a581852c061453`
- Pre-release app commit: `55ea92a8f935372f78f1fa97090dd7fe2bc22c02`
- Approved patched `runAgentLoop` deployed to Base44 production and verified by pulling the live function back and comparing source.
- Railway auth canary deployment: `c0434d5f-20b5-4e6d-a961-feda2e9928c5`
- Canary source: branch `apex/railway-preview-auth-canary-20261002`, commit `8dc96f3f21479df1829c3e15b23ea5fd57d57d6f`
- Canary executed `auth_probe` only; it did not dequeue or execute AgentTask records.

### Probe result
`AUTH_CANARY_FAIL`
- HTTP: 500
- runtime secret present: false
- environment secret present: false
- runtime match: false
- environment match: false

Conclusion: Base44 management metadata lists `WORKER_SECRET`, but the deployed backend function runtime receives neither the `base44:runtime` secret nor the environment variable. This rules out Railway credential mismatch as the immediate cause.

### Rollback evidence
- Base44 `runAgentLoop` rolled back to the preserved pre-change package.
- Fresh Base44 pull verified the live function matches the preserved rollback source and no longer matches the probe patch.
- Railway orchestrator restored to `main`.
- Railway rollback deployment: `f10114d1-b050-4e14-8312-be5bb4e46e04`
- Railway rollback status: SUCCESS
- Railway rollback commit: `55ea92a8f935372f78f1fa97090dd7fe2bc22c02`
- Canary mode neutralized.
- Remaining seven agent lanes were not rolled forward.

### Open blocker
Base44 secret propagation/runtime availability must be repaired, or worker authentication must be migrated away from Base44 runtime secrets before the 8-lane fleet can be activated.
