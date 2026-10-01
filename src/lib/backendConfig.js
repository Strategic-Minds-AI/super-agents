// ═══════════════════════════════════════════════════════════════
// BACKEND CONFIG — the single switch that controls where data goes.
// Flip these when you deploy to Supabase/Vercel/Drive/Railway.
// No page or component reads this directly — the facade files do.
// ═══════════════════════════════════════════════════════════════

export const DATA_BACKEND = 'base44';      // 'base44' | 'supabase'
export const AUTH_BACKEND = 'base44';      // 'base44' | 'supabase'
export const STORAGE_BACKEND = 'base44';   // 'base44' | 'drive'
export const FUNCTION_BACKEND = 'base44';  // 'base44' | 'vercel' | 'railway'

// ── Supabase connection (fill in when you create the project) ──
export const SUPABASE_URL = '';       // https://xxx.supabase.co
export const SUPABASE_ANON_KEY = '';  // public anon key

// ── Vercel/Railway function base URL (when functions move off Base44) ──
export const FUNCTION_BASE_URL = ''; // https://your-app.vercel.app/api or https://your-app.up.railway.app