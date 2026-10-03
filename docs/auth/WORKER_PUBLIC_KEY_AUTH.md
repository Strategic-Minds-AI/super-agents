# Railway -> Base44 Public-Key Worker Authentication

## Objective

Remove the dependency on Base44 runtime secret propagation for Railway workers.

Each Railway lane owns a unique ECDSA P-256 private key. Base44 stores only the corresponding public key in source. Requests are signed over the exact JSON body hash plus timestamp, nonce, key id, and protocol version.

## Security properties

- Base44 stores no Railway private credential.
- One private key per lane limits blast radius.
- Key id is cryptographically bound into the signature.
- Agent name is checked against the key's allowed lane.
- Requests older than 90 seconds are rejected.
- Missing or untrusted keys fail closed.
- Auth-probe mode performs no AgentTask dequeue or execution.
- Private key material must never enter Git, receipts, logs, chat, or Base44.

## Protocol

Headers:

- `X-SMA-Auth-Version: sma-v1`
- `X-SMA-Key-Id: <lane>-v1`
- `X-SMA-Timestamp: <unix-seconds>`
- `X-SMA-Nonce: <uuid>`
- `X-SMA-Signature: <base64url ECDSA P-256 signature>`

Canonical signing input:

```text
sma-v1
<key-id>
<unix-seconds>
<nonce>
<sha256-hex-of-exact-request-body>
```

## Provisioning sequence

1. Generate a keypair for one sandbox lane with `node local-worker/generate-worker-key.mjs <agent_name>`.
2. Keep the private-key file local and protected.
3. Add only the public SPKI value to `TRUSTED_WORKER_KEYS` in `base44/shared/workerAuth.ts`.
4. Set Railway variables for that lane:
   - `WORKER_KEY_ID=<agent>-v1`
   - `WORKER_PRIVATE_KEY_PKCS8_B64=<private-key-file-content>`
5. Set `AUTH_CANARY=1`.
6. Deploy the lane and require `AUTH_CANARY_PASS`.
7. Restore `AUTH_CANARY=0` before enabling task execution.
8. Repeat per lane only after independent validation.

## Rollback

Return the Railway service to the prior branch/SHA and remove or disable the public-key verifier function deployment. Existing legacy `WORKER_SECRET` variables may remain temporarily during migration but are not consulted by the public-key path.
