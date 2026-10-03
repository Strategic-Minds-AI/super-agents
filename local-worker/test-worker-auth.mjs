import {
  generateKeyPairSync,
  createHash,
  createPrivateKey,
  randomUUID,
  sign as cryptoSign,
} from 'node:crypto';
import {
  verifySignedWorkerRequestWithKeys,
} from '../base44/shared/workerAuth.ts';

const AUTH_VERSION = 'sma-v1';
const keyId = 'orchestrator-v1';
const agent = 'orchestrator';

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { format: 'der', type: 'spki' },
  privateKeyEncoding: { format: 'der', type: 'pkcs8' },
});

const privateKeyObject = createPrivateKey({
  key: privateKey,
  format: 'der',
  type: 'pkcs8',
});

const trusted = {
  [keyId]: {
    spki_base64: Buffer.from(publicKey).toString('base64'),
    agents: [agent],
  },
};

function signedRequest(body, {
  requestAgent = agent,
  timestamp = Math.floor(Date.now() / 1000),
  mutateSignature = false,
  kid = keyId,
} = {}) {
  const rawBody = JSON.stringify({ ...body, agent_name: requestAgent });
  const nonce = randomUUID();
  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  const signingInput = [
    AUTH_VERSION,
    kid,
    String(timestamp),
    nonce,
    bodyHash,
  ].join('\n');

  let signature = cryptoSign(
    'sha256',
    Buffer.from(signingInput, 'utf8'),
    { key: privateKeyObject, dsaEncoding: 'ieee-p1363' },
  ).toString('base64url');

  if (mutateSignature) {
    signature = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
  }

  const req = new Request('https://example.test/functions/runAgentLoop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SMA-Auth-Version': AUTH_VERSION,
      'X-SMA-Key-Id': kid,
      'X-SMA-Timestamp': String(timestamp),
      'X-SMA-Nonce': nonce,
      'X-SMA-Signature': signature,
    },
    body: rawBody,
  });

  return { req, rawBody };
}

async function expect(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}

{
  const { req, rawBody } = signedRequest({ auth_probe: true });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, agent, trusted);
  await expect('valid signature', r.ok === true && r.reason === 'verified');
}

{
  const { req, rawBody } = signedRequest({ auth_probe: true }, { mutateSignature: true });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, agent, trusted);
  await expect('tampered signature rejected', r.ok === false && r.reason === 'signature_invalid');
}

{
  const { req, rawBody } = signedRequest({ auth_probe: true }, { requestAgent: 'growth_operator' });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, 'growth_operator', trusted);
  await expect('cross-lane agent rejected', r.ok === false && r.reason === 'agent_not_allowed_for_key');
}

{
  const { req, rawBody } = signedRequest({ auth_probe: true });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, '', trusted);
  await expect('missing agent rejected', r.ok === false && r.reason === 'agent_required');
}

{
  const stale = Math.floor(Date.now() / 1000) - 300;
  const { req, rawBody } = signedRequest({ auth_probe: true }, { timestamp: stale });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, agent, trusted);
  await expect('stale request rejected', r.ok === false && r.reason === 'timestamp_out_of_window');
}

{
  const { req, rawBody } = signedRequest({ auth_probe: true });
  const r = await verifySignedWorkerRequestWithKeys(req, rawBody, agent, {});
  await expect('empty registry fails closed', r.ok === false && r.reason === 'untrusted_key');
}

console.log('WORKER_AUTH_TESTS=PASS');
