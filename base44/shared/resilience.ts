// RESILIENCE MODULE — the reason this system doesn't break.
// Every other builder's loop dies on the first transient failure.
// This one retries, recovers, isolates, and circuit-breaks.
// Imported by both runAgentLoop and runAutonomousHeartbeat.

// ── 1. RETRY WITH EXPONENTIAL BACKOFF ──
// Transient failures (network blips, rate limits, 502s) get retried, not killed.
export async function withRetry(fn, opts = {}) {
  const { retries = 3, baseDelay = 500, maxDelay = 5000 } = opts;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── 2. TIMEOUT ──
// Don't let one task hang the whole loop forever.
export function withTimeout(promise, ms, label = 'task') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}

// ── 3. STUCK-TASK RECOVERY ──
// If a heartbeat crashes mid-task, that task stays "in_progress" forever.
// This resets any task stuck > threshold back to "pending" so it gets retried.
export async function recoverStuckTasks(base44, thresholdMs = 10 * 60 * 1000) {
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();
  const stuck = await base44.asServiceRole.entities.AgentTask.filter(
    { status: 'in_progress', updated_date: { $lt: cutoff } },
    { limit: 20 }
  );
  let recovered = 0;
  for (const t of (stuck.items || [])) {
    try {
      await base44.asServiceRole.entities.AgentTask.update(t.id, {
        status: 'pending',
        result: `recovered_from_stuck at ${new Date().toISOString()}`.slice(0, 1000)
      });
      recovered++;
    } catch (e) { /* keep going — one failed recovery doesn't stop the rest */ }
  }
  return recovered;
}

// ── 4. CIRCUIT BREAKER ──
// If Gmail (or any external API) fails N times in a row, stop hammering it
// for the rest of this run and queue the work for later instead.
export function createCircuitBreaker(threshold = 3) {
  let failures = 0;
  let tripped = false;
  return {
    recordSuccess: () => { failures = 0; tripped = false; },
    recordFailure: () => { failures++; if (failures >= threshold) tripped = true; },
    isTripped: () => tripped,
    failureCount: () => failures
  };
}

// ── 5. GMAIL SENDING — the "act" step ──
// Sends a real email via the authorized Gmail connector.
// Uses UTF-8-safe base64url encoding for the RFC 2822 raw message.
export async function sendGmailReport(base44, { to, subject, body }) {
  const conn = await base44.asServiceRole.connectors.getConnection('gmail');
  const accessToken = conn.accessToken;

  // Get the sender's email via the Google userinfo endpoint (works with the `email` scope,
  // unlike the Gmail profile API which needs gmail.readonly)
  const profileRes = await withRetry(() =>
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  );
  if (!profileRes.ok) throw new Error(`Gmail userinfo failed: ${profileRes.status}`);
  const profile = await profileRes.json();
  const from = profile.email;

  // Build RFC 2822 message
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    body
  ].join('\r\n');

  // UTF-8-safe base64url encoding
  const encoded = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encoded })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text().catch(() => '');
    throw new Error(`Gmail send failed: ${sendRes.status} ${errText.slice(0, 200)}`);
  }
  const result = await sendRes.json();
  return { messageId: result.id, from, to };
}

// ── 6. SAFE GMAIL SEND (with circuit breaker) ──
// Wraps sendGmailReport with retry + circuit breaker.
// If the breaker is tripped, returns { skipped: true } instead of throwing.
export async function safeSendGmail(base44, breaker, { to, subject, body }) {
  if (breaker.isTripped()) {
    return { skipped: true, reason: 'circuit_breaker_tripped', failureCount: breaker.failureCount() };
  }
  try {
    const result = await withRetry(() => sendGmailReport(base44, { to, subject, body }), { retries: 2 });
    breaker.recordSuccess();
    return { sent: true, ...result };
  } catch (e) {
    breaker.recordFailure();
    return { sent: false, error: e.message, failureCount: breaker.failureCount() };
  }
}