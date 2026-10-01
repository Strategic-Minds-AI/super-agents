// ═══════════════════════════════════════════════════════════════
// AUTH CLIENT — the swappable interface for authentication.
// Today: delegates to Base44 auth.
// Tomorrow: swap to Supabase Auth — same method names, no page changes.
// ═══════════════════════════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { AUTH_BACKEND } from './backendConfig';

// ── BASE44 AUTH (current) ──
const base44Auth = {
  me: () => base44.auth.me(),
  isAuthenticated: () => base44.auth.isAuthenticated(),
  logout: (redirectUrl) => base44.auth.logout(redirectUrl),
  updateMe: (data) => base44.auth.updateMe(data),
  redirectToLogin: (nextUrl) => base44.auth.redirectToLogin(nextUrl),
};

// ── SUPABASE AUTH (uncomment when ready) ──
// import { createClient } from '@supabase/supabase-js';
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from './backendConfig';
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//
// const supabaseAuth = {
//   me: async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return null; return { id: user.id, email: user.email, full_name: user.user_metadata?.full_name, role: user.user_metadata?.role || 'user' }; },
//   isAuthenticated: async () => { const { data: { session } } = await supabase.auth.getSession(); return !!session; },
//   logout: async (redirectUrl) => { await supabase.auth.signOut(); if (redirectUrl) window.location.href = redirectUrl; else window.location.reload(); },
//   updateMe: async (data) => { const { data: { user }, error } = await supabase.auth.updateUser({ data }); if (error) throw error; return user; },
//   redirectToLogin: (nextUrl) => { window.location.href = `/login${nextUrl ? `?returnTo=${encodeURIComponent(nextUrl)}` : ''}`; },
// };

export const auth = AUTH_BACKEND === 'base44' ? base44Auth : base44Auth; // swap second arg to supabaseAuth when ready