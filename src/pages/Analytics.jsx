import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Activity, Globe, Hammer, Layers, Zap, Link2, Rocket, Clock, CheckCircle2, AlertTriangle, TrendingUp, Wifi } from "lucide-react";

const STATUS_COLORS = {
  pending: "#8A7300", in_progress: "#2563EB", completed: "#16A34A", failed: "#DC2626",
  available: "#16A34A", bought: "#7C3AED", unavailable: "#DC2626", discovered: "#8A7300",
  delivered: "#16A34A", building: "#2563EB", spec_submitted: "#8A7300", planning: "#2563EB",
  running: "#2563EB", complete: "#16A34A", queued: "#8A7300"
};

export default function Analytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const [taskAgg, domainAgg, buildAgg, batchAgg, recent] = await Promise.all([
        base44.entities.AgentTask.aggregate({ groupBy: 'status' }),
        base44.entities.DomainInventory.aggregate({ groupBy: 'status' }),
        base44.entities.SystemBuild.aggregate({ groupBy: 'status' }),
        base44.entities.BatchOperation.aggregate({ groupBy: 'status' }),
        base44.entities.AgentTask.filter({}, { sort: '-created_date', limit: 10 })
      ]);

      const toMap = (agg) => {
        const m = {};
        (agg.rows || []).forEach(r => { m[r._id || r.status] = r.count; });
        return m;
      };

      setStats({
        tasks: toMap(taskAgg),
        domains: toMap(domainAgg),
        builds: toMap(buildAgg),
        batches: toMap(batchAgg)
      });
      setActivity(recent.items || []);
      setLastSync(new Date().toISOString());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.AgentTask.subscribe(() => load());
    return unsub;
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const batchSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await base44.functions.invoke("runAgentLoop", { max_cycles: 10, trigger: "analytics_sync" });
      setSyncResult(res.data || res);
      await load();
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  };

  const batchConnect = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const domains = await base44.entities.DomainInventory.filter({ status: 'bought' }, { limit: 100 });
      const tasks = [];
      for (const d of (domains.items || [])) {
        tasks.push({ agent_name: 'growth_operator', task_type: 'google_connect', domain: d.domain, title: `Google: ${d.domain}`, priority: 'medium', autonomous: true, status: 'pending' });
        tasks.push({ agent_name: 'social_strategist', task_type: 'social_connect', domain: d.domain, title: `Social: ${d.domain}`, priority: 'medium', autonomous: true, status: 'pending' });
      }
      if (tasks.length > 0) await base44.entities.AgentTask.bulkCreate(tasks);
      setSyncResult({ connected: tasks.length, domains: (domains.items || []).length });
      await load();
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  };

  const batchEverything = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await base44.functions.invoke("runBatchOperation", {
        name: "Analytics Full Sync", batch_size: 10, template: {}, variables: "[]",
        deploy_targets: ["github"], google_connect: true, social_connect: true, video_generate: false, content_optimize: true,
        free_mode: true
      });
      setSyncResult(res.data || res);
      await load();
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  };

  const total = (m) => Object.values(m || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="xa-pill-badge">24/7 ANALYTICS</span>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-black mt-1 truncate">Live Operations Dashboard</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("/website-factory")} className="xa-btn-outline text-xs px-3 py-2">🏭 Factory</button>
            <button onClick={() => navigate("/")} className="xa-btn-outline text-xs px-3 py-2">← Home</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* 24/7 Sync indicator */}
        <div className="xa-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wifi className="w-5 h-5 text-green-500" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-black">24/7 Real-time Sync</div>
              <div className="text-[10px] text-black/50">Auto-refreshes every 30s · {lastSync ? new Date(lastSync).toLocaleTimeString() : 'never'}</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="text-black/50 hover:text-black">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* KPI Cards */}
        {loading && !stats ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#CCBB00]" /></div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Tasks */}
            <div className="xa-card p-4">
              <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-[#CCBB00]" /><span className="text-xs font-bold text-black/50 uppercase">Tasks</span></div>
              <div className="font-heading font-black text-2xl text-black">{total(stats.tasks)}</div>
              <div className="flex gap-2 mt-1.5 text-[10px]">
                <span className="text-[#8A7300] font-bold">{stats.tasks.pending || 0} pending</span>
                <span className="text-green-600 font-bold">{stats.tasks.completed || 0} done</span>
                <span className="text-red-500 font-bold">{stats.tasks.failed || 0} fail</span>
              </div>
            </div>
            {/* Domains */}
            <div className="xa-card p-4">
              <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-[#CCBB00]" /><span className="text-xs font-bold text-black/50 uppercase">Domains</span></div>
              <div className="font-heading font-black text-2xl text-black">{total(stats.domains)}</div>
              <div className="flex gap-2 mt-1.5 text-[10px]">
                <span className="text-[#8A7300] font-bold">{stats.domains.available || 0} avail</span>
                <span className="text-purple-600 font-bold">{stats.domains.bought || 0} bought</span>
              </div>
            </div>
            {/* Builds */}
            <div className="xa-card p-4">
              <div className="flex items-center gap-2 mb-2"><Hammer className="w-4 h-4 text-[#CCBB00]" /><span className="text-xs font-bold text-black/50 uppercase">Builds</span></div>
              <div className="font-heading font-black text-2xl text-black">{total(stats.builds)}</div>
              <div className="flex gap-2 mt-1.5 text-[10px]">
                <span className="text-blue-600 font-bold">{stats.builds.building || 0} building</span>
                <span className="text-green-600 font-bold">{stats.builds.delivered || 0} delivered</span>
              </div>
            </div>
            {/* Batches */}
            <div className="xa-card p-4">
              <div className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-[#CCBB00]" /><span className="text-xs font-bold text-black/50 uppercase">Batches</span></div>
              <div className="font-heading font-black text-2xl text-black">{total(stats.batches)}</div>
              <div className="flex gap-2 mt-1.5 text-[10px]">
                <span className="text-blue-600 font-bold">{stats.batches.running || 0} running</span>
                <span className="text-green-600 font-bold">{stats.batches.complete || 0} done</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Batch Actions */}
        <div className="xa-card p-5">
          <h2 className="font-heading font-bold text-lg text-black mb-3">Batch Operations</h2>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={batchSync} disabled={syncing} className="xa-btn-primary w-full">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Batch Sync — run agent loop (10 cycles)
            </button>
            <button onClick={batchConnect} disabled={syncing} className="xa-btn-outline w-full">
              <Link2 className="w-4 h-4" /> Batch Connect — Google + Social for all bought domains
            </button>
            <button onClick={batchEverything} disabled={syncing} className="xa-btn-outline w-full">
              <Rocket className="w-4 h-4" /> Batch Everything — launch full factory pipeline
            </button>
          </div>
          {syncResult && (
            <div className="mt-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
              {syncResult.error ? (
                <span className="text-red-600">Error: {syncResult.error}</span>
              ) : syncResult.connected != null ? (
                <span className="text-green-600">✓ Dispatched {syncResult.connected} connect tasks for {syncResult.domains} domains</span>
              ) : syncResult.tasks_dispatched ? (
                <span className="text-green-600">✓ Batch launched: {syncResult.sites} sites, {syncResult.tasks_dispatched} tasks</span>
              ) : syncResult.actions_executed != null ? (
                <span className="text-green-600">✓ Sync complete: {syncResult.actions_executed} actions, {syncResult.followups_dispatched} follow-ups</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="font-heading font-bold text-lg text-black mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="xa-card p-8 text-center">
              <Clock className="w-6 h-6 mx-auto text-black/20" />
              <p className="text-black/50 mt-2 text-xs">No activity yet. Run a batch or the agent loop to see live data.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activity.map((t) => {
                const color = STATUS_COLORS[t.status] || "#8A7300";
                return (
                  <div key={t.id} className="xa-card p-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-black truncate">{t.title}</div>
                      <div className="text-[10px] text-black/40 truncate">{t.agent_name} · {t.task_type || 'generic'} {t.domain ? `· ${t.domain}` : ''}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${color}20`, color }}>{t.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}