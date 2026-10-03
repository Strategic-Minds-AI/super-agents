# Strategic Minds Railway Worker

This worker runs the Base44 `runAgentLoop` continuously from Railway or a local Node.js 20+ runtime.

## Authentication model

The worker no longer depends on a shared secret being readable inside the Base44 function runtime. Each lane signs requests with its own ECDSA P-256 private key. Base44 verifies the signature using a non-secret public key committed in `base44/shared/workerAuth.ts`.

Private keys exist only in Railway/local protected variables and must never be committed.

## Required variables

| Variable | Required | Description |
|---|---:|---|
| `APP_URL` | yes | Base44 app URL |
| `AGENT_NAME` | yes | Lane identity such as `orchestrator` |
| `WORKER_KEY_ID` | yes | Key id such as `orchestrator-v1` |
| `WORKER_PRIVATE_KEY_PKCS8_B64` | yes | Base64 PKCS#8 P-256 private key |
| `POLL_INTERVAL` | no | Default 60000 |
| `MAX_CYCLES` | no | Default 5 |
| `REPORT_EMAIL` | no | Optional report recipient |
| `AUTH_CANARY` | no | Set to 1 for side-effect-free authentication validation |

## Generate a lane keypair

From `local-worker/`:

```bash
node generate-worker-key.mjs orchestrator
```

The command does not print private key material. It writes:

- `.worker-keys/orchestrator-v1.private.pkcs8.b64`
- `.worker-keys/orchestrator-v1.public.json`

The private file is a Railway secret input. The public JSON supplies the key id and `spki_base64` value for the Base44 verifier registry.

## Canary gate

Before allowing a lane to execute tasks:

1. provision its private key to Railway;
2. add its public key to `TRUSTED_WORKER_KEYS`;
3. deploy the verifier;
4. set `AUTH_CANARY=1`;
5. require `AUTH_CANARY_PASS`;
6. set `AUTH_CANARY=0`;
7. only then enable normal agent-loop polling.

Auth canary mode returns before Base44 queries or mutates `AgentTask`.

See `docs/auth/WORKER_PUBLIC_KEY_AUTH.md` for the protocol and rollback contract.
