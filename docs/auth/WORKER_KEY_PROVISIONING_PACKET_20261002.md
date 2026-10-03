# Super Agents — Railway Public-Key Provisioning Packet

Date: 2026-10-02
Status: STAGED — no private keys generated or written to providers by this packet.

## Target project

- Railway workspace: Strategic Minds AI
- Railway project: Strategic Sandbox System
- Project ID: `15f90272-e2f6-4739-8286-91447f545d71`
- Base44 app: SUPER AGENTS
- Base44 app ID: `6abe230b2d09558c618be440`

## Lane map

| Agent | Railway service ID | Environment ID | Planned key id |
|---|---|---|---|
| orchestrator | `3fc125a8-295e-4dd2-8a76-c695d911f4d3` | `7f527cdf-76c2-4385-a6e6-619b4e4181c4` | `orchestrator-v1` |
| growth_operator | `e7a2df53-7ee1-4263-8405-e5fbb906bbe7` | `e2d0fae3-3515-4632-8200-3db41e6b8699` | `growth_operator-v1` |
| code_architect | `f21a857e-bf86-4f84-b478-4df2ff4692c1` | `30d1f937-6b6a-4b64-af93-c5f20ebad857` | `code_architect-v1` |
| social_strategist | `c98f95d0-cf86-4b55-a286-0175d2c7d3cb` | `d1380a7b-6ad9-454c-ab83-c36fde7f3ea0` | `social_strategist-v1` |
| sales_engine | `34ed6080-7e6c-41d8-bd19-2e936dc2fdda` | `94fda369-9890-4354-a78b-ba294505b160` | `sales_engine-v1` |
| brand_guardian | `a0878241-007d-4d4b-b65f-6f5a1e0727ac` | `9759f60a-26ea-46f8-8543-89601b407a58` | `brand_guardian-v1` |
| replicator | `d4f921f0-f77d-4794-a0f8-221bf6a2549b` | `138e00c1-0d9e-42c5-b7e6-73d46041d0df` | `replicator-v1` |
| swarm | `953fdf7d-57bf-46c2-b380-9eb34f9af972` | `fd34ebc3-ac15-47fb-a3b2-c830c05eedcb` | `swarm-v1` |

## Per-lane Railway variables

Protected secret:
- `WORKER_PRIVATE_KEY_PKCS8_B64`

Non-secret:
- `WORKER_KEY_ID`
- existing `AGENT_NAME`
- `AUTH_CANARY=1` during validation only

The legacy `WORKER_SECRET` may remain during migration but is not read by the public-key branch.

## Public verifier registry

For each lane, add only this non-secret shape to `TRUSTED_WORKER_KEYS`:

```ts
'<key-id>': {
  spki_base64: '<public-spki-base64>',
  agents: ['<agent-name>'],
}
```

## Canary sequence

1. Provision orchestrator private key to Railway only.
2. Commit orchestrator public key to the branch.
3. Deploy only `runAgentLoop` verifier code to Base44 under explicit approval.
4. Deploy only `sandbox-orchestrator` from this branch with `AUTH_CANARY=1`.
5. Require terminal Railway `SUCCESS` and `AUTH_CANARY_PASS`.
6. Set `AUTH_CANARY=0`, but keep task execution gated until queue quarantine/classification is complete.
7. Repeat lane-by-lane only after independent validation.

## Queue gate

Do not activate normal worker mode while the current 30 pending autonomous AgentTask records remain unclassified. Known task classes include:
- build_system
- google_connect
- social_connect
- content_optimize
- submit_sitemap
- request_indexing
- audit_seo

Known targets include test/example domains and third-party domains such as notion.so, linear.app, and stripe.com.

## Protected action boundary

This packet does not authorize:
- generation or storage of private keys in Railway;
- Base44 production function deployment;
- enabling autonomous task execution;
- queue mutation/quarantine;
- rollout to all eight lanes.

Exact next approval phrase proposed:

`APPROVE SUPER AGENTS PUBLIC-KEY CANARY: GENERATE + BIND ORCHESTRATOR KEY AND DEPLOY AUTH PROBE ONLY`
