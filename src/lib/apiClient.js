// ═══════════════════════════════════════════════════════════════
// API CLIENT — the swappable interface for backend function calls.
// Today: delegates to Base44 functions.invoke.
// Tomorrow: swap to fetch() against your Vercel/Railway endpoints —
//           same method signature, no page changes.
// ═══════════════════════════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { FUNCTION_BACKEND, FUNCTION_BASE_URL } from './backendConfig';

// ── BASE44 FUNCTIONS (current) ──
const base44Api = {
  invoke: async (name, data) => base44.functions.invoke(name, data),
};

// ── VERCEL / RAILWAY FUNCTIONS (uncomment when ready) ──
// const externalApi = {
//   invoke: async (name, data) => {
//     const res = await fetch(`${FUNCTION_BASE_URL}/api/${name}`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(data),
//     });
//     if (!res.ok) throw new Error(`${name} failed: ${res.status}`);
//     return { data: await res.json() };
//   },
// };

export const api = FUNCTION_BACKEND === 'base44' ? base44Api : base44Api; // swap second arg to externalApi when ready