# Worker Public-Key Authentication Build Receipt

Date: 2026-10-02
Branch: `apex/railway-public-key-auth-20261002`
Base: `55ea92a8f935372f78f1fa97090dd7fe2bc22c02`

## Problem

Base44 management listed `WORKER_SECRET`, but a production auth probe proved both runtime secret sources absent:
- runtime_secret_present=false
- env_secret_present=false

The prior probe was rolled back successfully. This branch removes that Base44 runtime-secret dependency.

## Branch implementation

- Added `base44/shared/workerAuth.ts`:
  - ECDSA P-256 verification
  - exact request-body SHA-256 binding
  - protocol version, key id, timestamp, nonce, signature headers
  - 90-second timestamp window
  - per-key allowed agent list
  - mandatory signed worker agent identity
  - empty trusted-key registry by default (fail closed)
- Updated `runAgentLoop`:
  - reads exact raw body before verification
  - side-effect-free `auth_probe`
  - invalid signed worker attempts return 401 and never fall through to user auth
  - normal interactive user auth remains available when no worker signature is attempted
- Updated Railway worker:
  - signs every request with PKCS#8 P-256 private key
  - no Base44 shared secret required
  - canary mode remains side-effect free
- Added `generate-worker-key.mjs`:
  - private key written with mode 0600
  - private key is never printed
  - public metadata written separately
- Added `.worker-keys/` to gitignore.
- Added protocol and provisioning documentation.

## Validation performed

- Node syntax check: PASS for signer and key generator logic.
- Deterministic P-256 key generation: PASS.
- Private key file permission: PASS (0600).
- Private key stdout exposure: PASS (not printed).
- Node signer -> WebCrypto verifier compatibility: PASS.
- Signature tamper rejection: PASS.
- Missing agent rejection: PASS.
- Cross-lane agent rejection: PASS.
- Branch trusted-key registry currently empty: PASS (fail closed).

## Known limitation

Timestamp + nonce are signature-bound, but the current Base44 verifier does not persist nonce state. Replay exposure is therefore bounded by the 90-second timestamp window rather than eliminated with durable nonce storage. This is acceptable for the canary but should be revisited during the full backend migration.

## Production state

No production changes were made by this branch build.
No new private key was generated for a provider.
No Railway secret/environment variable was changed.
No Base44 function was deployed.
No AgentTask was executed or modified.

## Next protected action

Provision one orchestrator keypair, place the private key only in the orchestrator Railway sandbox, commit only the public key, deploy the verifier, and run auth-probe mode only.


## Exact-SHA GitHub Actions validation

Validated branch head:
- `80b64a1c60c66915f88672acb94e7a00ae661c39`

Workflow:
- Name: `Worker Auth CI`
- Run ID: `37080662489`
- Job ID: `111080227803`
- Conclusion: **SUCCESS**

Passed steps:
- checkout
- Node 22 setup
- worker syntax check
- key generator syntax check
- protocol tests
- key generator safety test

Independent in-house validator routes:
- Vision Cortex validator: BLOCKED by connected-app monthly integration limit.
- Xtreme Fault Line QA: BLOCKED by connected-app monthly integration limit.

These blocked validator routes are not treated as PASS. GitHub Actions provides the current independent machine-validation evidence for the exact branch SHA.
