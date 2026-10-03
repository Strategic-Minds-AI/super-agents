// Public-key worker authentication for Railway -> Base44.
// Base44 stores only public verification keys in source. Railway stores private
// signing keys in service variables. No shared secret is required in Base44.

export type TrustedWorkerKey = {
  spki_base64: string;
  agents: string[];
};

// Fail closed until explicit key provisioning populates this registry.
// One key per lane is required; never reuse a private key across lanes.
export const TRUSTED_WORKER_KEYS: Record<string, TrustedWorkerKey> = Object.freeze({
  'orchestrator-v1': {
    spki_base64: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvciyqa36dXKKIgx7/GWroeWNPeXZAo8FpZJB9TbAPkiCNnEybdaVPvFhUz4V2rt2YYAY3aAFlFbkMtTHUlFJMQ==',
    agents: ['orchestrator'],
  },
});

const AUTH_VERSION = 'sma-v1';
const MAX_SKEW_SECONDS = 90;
const encoder = new TextEncoder();

function fromBase64(input: string): Uint8Array {
  const binary = atob(input);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return fromBase64(padded);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function workerAuthConfigured(): boolean {
  return Object.values(TRUSTED_WORKER_KEYS).some(v => !!v?.spki_base64);
}

export async function verifySignedWorkerRequestWithKeys(
  req: Request,
  rawBody: string,
  expectedAgent = '',
  trustedKeys: Record<string, TrustedWorkerKey> = TRUSTED_WORKER_KEYS,
) {
  try {
    const version = req.headers.get('x-sma-auth-version') || '';
    const keyId = req.headers.get('x-sma-key-id') || '';
    const timestamp = req.headers.get('x-sma-timestamp') || '';
    const nonce = req.headers.get('x-sma-nonce') || '';
    const signature = req.headers.get('x-sma-signature') || '';

    if (!version || !keyId || !timestamp || !nonce || !signature) {
      return { ok: false, reason: 'missing_auth_headers', method: 'ecdsa-p256', key_id: keyId || null };
    }
    if (version !== AUTH_VERSION) {
      return { ok: false, reason: 'unsupported_auth_version', method: 'ecdsa-p256', key_id: keyId };
    }
    if (!/^\d{10}$/.test(timestamp)) {
      return { ok: false, reason: 'invalid_timestamp', method: 'ecdsa-p256', key_id: keyId };
    }
    if (!/^[A-Za-z0-9-]{16,80}$/.test(nonce)) {
      return { ok: false, reason: 'invalid_nonce', method: 'ecdsa-p256', key_id: keyId };
    }

    const now = Math.floor(Date.now() / 1000);
    const sentAt = Number(timestamp);
    if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > MAX_SKEW_SECONDS) {
      return { ok: false, reason: 'timestamp_out_of_window', method: 'ecdsa-p256', key_id: keyId };
    }

    if (!expectedAgent) {
      return { ok: false, reason: 'agent_required', method: 'ecdsa-p256', key_id: keyId };
    }

    const trusted = trustedKeys[keyId];
    if (!trusted?.spki_base64) {
      return { ok: false, reason: 'untrusted_key', method: 'ecdsa-p256', key_id: keyId };
    }
    if (expectedAgent && !trusted.agents.includes(expectedAgent)) {
      return { ok: false, reason: 'agent_not_allowed_for_key', method: 'ecdsa-p256', key_id: keyId };
    }

    const bodyHash = await sha256Hex(rawBody);
    const signingInput = [
      AUTH_VERSION,
      keyId,
      timestamp,
      nonce,
      bodyHash,
    ].join('\n');

    const publicKey = await crypto.subtle.importKey(
      'spki',
      fromBase64(trusted.spki_base64),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );

    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      fromBase64Url(signature),
      encoder.encode(signingInput),
    );

    return {
      ok,
      reason: ok ? 'verified' : 'signature_invalid',
      method: 'ecdsa-p256',
      key_id: keyId,
    };
  } catch {
    return { ok: false, reason: 'verification_error', method: 'ecdsa-p256', key_id: null };
  }
}


export async function verifySignedWorkerRequest(
  req: Request,
  rawBody: string,
  expectedAgent = '',
) {
  return verifySignedWorkerRequestWithKeys(req, rawBody, expectedAgent, TRUSTED_WORKER_KEYS);
}
