#!/usr/bin/env node
// Generate one P-256 lane keypair without printing the private key.
// Private key is written to .worker-keys/<kid>.private.pkcs8.b64 with mode 0600.
// Public key metadata is written to .worker-keys/<kid>.public.json.

import { generateKeyPairSync } from 'crypto';
import { mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

const agent = (process.argv[2] || '').trim();
if (!/^[a-z][a-z0-9_]{1,48}$/.test(agent)) {
  console.error('Usage: node generate-worker-key.mjs <agent_name>');
  process.exit(2);
}

const kid = `${agent}-v1`;
const outDir = join(process.cwd(), '.worker-keys');
mkdirSync(outDir, { recursive: true, mode: 0o700 });

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { format: 'der', type: 'spki' },
  privateKeyEncoding: { format: 'der', type: 'pkcs8' },
});

const privatePath = join(outDir, `${kid}.private.pkcs8.b64`);
const publicPath = join(outDir, `${kid}.public.json`);

writeFileSync(privatePath, Buffer.from(privateKey).toString('base64') + '\n', { mode: 0o600 });
chmodSync(privatePath, 0o600);

writeFileSync(
  publicPath,
  JSON.stringify({
    key_id: kid,
    agent,
    algorithm: 'ECDSA_P256_SHA256',
    spki_base64: Buffer.from(publicKey).toString('base64'),
  }, null, 2) + '\n',
  { mode: 0o600 },
);

console.log(JSON.stringify({
  key_id: kid,
  agent,
  public_key_file: publicPath,
  private_key_file: privatePath,
  private_key_printed: false,
}, null, 2));
