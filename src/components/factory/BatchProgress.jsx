import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Rocket, Activity } from "lucide-react";

export default function BatchProgress({ batchId, onLaunched }) {
  const [launching, setLaunching] = useState(false);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!batchId) return;
    try {
      const b = await base44.entities.BatchOperation.get(batchId);
      setBatch(b);
    } catch (e) {}
  }, [batchId]);
  useEffect(() => { load(); const i = setInterval(load, 3000); return () => clearInterval(i); }, [load]);

  const launch = async () => {
    setLaunching(true); setError(null);
    try {
      const res = await base44.functions.invoke("runBatchOperation", {
        name: "Quick batch", batch_size: 10, template: {}, variables: "[]", deploy_targets: [], google_connect: true, social_connect: true, video_generate: false, content_optimize: true
      });
      if (onLaunched) onLaunched(res.data?.batch_id);
    } catch (e) { setError(e.message); }
    setLaunching(false);
  };

  if (!batchId) {
    return (
      <button onClick={launch} disabled={launching} className="xa-btn-primary w-full py-4 text-base">
        {launching ? <><Loader2 className="w-5 h-5 animate-spin" /> Dispatching…</> : <><Rocket className="w-5 h-5" /> Launch batch</>}
      </button>
    );
  }

  if (!batch) return <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#5B7FA8]" /></div>;

  const pct = batch.progress || 0;
  const stats = [
    { label: "Built", value: batch.sites_built, color: "#16A34A" },
    { label: "Deployed", value: batch.sites_deployed, color: "#2563EB" },
    { label: "Videos", value: batch.videos_generated, color: "#7C3AED" },
    { label: "Posts", value: batch.social_posts, color: "#DC2626" }
  ];

  return (
    <section className="xa-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-[#5B7FA8]" />
        <h2 className="font-heading font-bold text-lg text-white">{batch.name}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#B8C5D6] ml-auto">{batch.status}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1"><span className="text-white/50">Progress</span><span className="font-bold text-white">{pct}%</span></div>
        <div className="h-2.5 rounded-full bg-[#2a2a2a] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1a1a1a,#8BA5C0,#2a2a2a)" }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg bg-[#171717]">
            <div className="font-heading font-black text-lg" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] font-bold text-white/50 uppercase">{s.label}</div>
          </div>
        ))}
      </div>
      {error && <div className="mt-3 p-2 rounded-lg bg-[#1f0d0d] border border-red-800 text-xs text-red-400">{error}</div>}
    </section>
  );
}