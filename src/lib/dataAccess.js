// ═══════════════════════════════════════════════════════════════
// DATA ACCESS LAYER — the single swappable interface for all DB ops.
// Today: delegates to Base44 entities.
// Tomorrow: swap createEntity to the Supabase impl — same interface,
//           zero page changes. Every page imports from here, never
//           from base44 directly.
// ═══════════════════════════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { DATA_BACKEND, SUPABASE_URL, SUPABASE_ANON_KEY } from './backendConfig';

// ── BASE44 IMPLEMENTATION (current) ──
function createBase44Entity(name) {
  const e = base44.entities[name];
  return {
    list: (opts) => e.list(opts),
    filter: (query, opts) => e.filter(query, opts),
    get: (id) => e.get(id),
    create: (data) => e.create(data),
    update: (id, data) => e.update(id, data),
    delete: (id) => e.delete(id),
    count: (query) => e.count(query || {}),
    aggregate: (opts) => e.aggregate(opts),
    subscribe: (cb) => e.subscribe(cb),
    bulkCreate: (records) => e.bulkCreate(records),
    bulkUpdate: (records) => e.bulkUpdate(records),
    updateMany: (query, update) => e.updateMany(query, update),
    deleteMany: (query) => e.deleteMany(query),
    upsert: (records, opts) => e.upsert(records, opts),
  };
}

// ── SUPABASE IMPLEMENTATION (uncomment when you create the project) ──
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//
// function createSupabaseEntity(tableName) {
//   const t = supabase.from(tableName);
//   return {
//     list: async (opts = {}) => {
//       let q = t.select('*').order(opts.sort?.replace('-', '') || 'created_date', { ascending: !opts.sort?.startsWith('-') }).limit(opts.limit || 50);
//       if (opts.cursor) q = q.lt('created_date', opts.cursor);
//       const { data, error } = await q;
//       if (error) throw error;
//       return { items: data, next_cursor: null, has_more: false };
//     },
//     filter: async (query = {}, opts = {}) => {
//       let q = t.select('*');
//       // translate MongoDB-style query to PostgREST filters
//       for (const [key, val] of Object.entries(query)) {
//         if (val && typeof val === 'object' && !Array.isArray(val)) {
//           if (val.$in) q = q.in(key, val.$in);
//           if (val.$gte) q = q.gte(key, val.$gte);
//           if (val.$lt) q = q.lt(key, val.$lt);
//           if (val.$ne) q = q.neq(key, val.$ne);
//           if (val.$regex) q = q.ilike(key, `%${val.$regex.replace(/[\^$]/g, '')}%`);
//         } else {
//           q = q.eq(key, val);
//         }
//       }
//       q = q.order(opts.sort?.replace('-', '') || 'created_date', { ascending: !opts.sort?.startsWith('-') }).limit(opts.limit || 50);
//       const { data, error } = await q;
//       if (error) throw error;
//       return { items: data, next_cursor: null, has_more: false };
//     },
//     get: async (id) => { const { data, error } = await t.select('*').eq('id', id).single(); if (error) throw error; return data; },
//     create: async (data) => { const { data: r, error } = await t.insert(data).select().single(); if (error) throw error; return r; },
//     update: async (id, data) => { const { data: r, error } = await t.update(data).eq('id', id).select().single(); if (error) throw error; return r; },
//     delete: async (id) => { const { error } = await t.delete().eq('id', id); if (error) throw error; return { id }; },
//     count: async (query = {}) => { let q = t.select('*', { count: 'exact', head: true }); for (const [k,v] of Object.entries(query)) { q = q.eq(k, v); } const { count, error } = await q; if (error) throw error; return count; },
//     aggregate: async (opts) => { /* implement using supabase rpc or raw SQL */ throw new Error('aggregate not implemented for supabase yet'); },
//     subscribe: (cb) => { const sub = supabase.channel(tableName).on('postgres_changes', { event: '*', schema: 'public', table: tableName }, cb).subscribe(); return () => supabase.removeChannel(sub); },
//     bulkCreate: async (records) => { const { data, error } = await t.insert(records).select(); if (error) throw error; return records; },
//     bulkUpdate: async (records) => { const res = []; for (const r of records) { res.push(await module.update(r.id, r)); } return res; },
//     updateMany: async (query, update) => { let q = t.update(update.$set || update); for (const [k,v] of Object.entries(query)) { q = q.eq(k, v); } const { error } = await q; if (error) throw error; return { updated: true }; },
//     deleteMany: async (query) => { let q = t.delete(); for (const [k,v] of Object.entries(query)) { q = q.eq(k, v); } const { error } = await q; if (error) throw error; return { deleted: true }; },
//     upsert: async (records, opts = {}) => { const { data, error } = await t.upsert(records, { onConflict: opts.key || 'id' }).select(); if (error) throw error; return { created: 0, updated: 0, records: data }; },
//   };
// }

const createEntity = DATA_BACKEND === 'base44' ? createBase44Entity : createBase44Entity; // swap second arg to createSupabaseEntity when ready

// ── THE DB OBJECT — import this everywhere, never base44.entities ──
export const db = {
  tasks: createEntity('AgentTask'),
  domains: createEntity('Domain'),
  builds: createEntity('SystemBuild'),
  batches: createEntity('BatchOperation'),
  inventory: createEntity('DomainInventory'),
  pipelines: createEntity('FactoryPipeline'),
  registrars: createEntity('RegistrarProfile'),
  workers: createEntity('WorkerFleet'),
};