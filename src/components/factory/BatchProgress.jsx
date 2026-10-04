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

  if (!batch) return <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#CCBB00]" /></div>;

  const pct = batch.progress || 0;
  const stats = [
    { label: "Built", value: batch.sites_built, color: "#16A34A" },
    { label: "Deployed", value: batch.sites_deployed, color: "#2563EB" },
    { label: "Failed", value: batch.sites_failed, color: "#DC2626" },
    { label: "Posts", value: batch.social_posts, color: "#7C3AED" }
  ];

  return (
    <section className="xa-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-[#CCBB00]" />
        <h2 className="font-heading font-bold text-lg text-black">{batch.name}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFF7B3] text-[#8A7300] ml-auto">{batch.status}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1"><span className="text-black/50">Progress</span><span className="font-bold text-black">{pct}%</span></div>
        <div className="h-2.5 rounded-full bg-[#E5E7EB] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#FFF7B3,#FFEA00,#E6D400)" }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg bg-[#FAFAFA]">
            <div className="font-heading font-black text-lg" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] font-bold text-black/50 uppercase">{s.label}</div>
          </div>
        ))}
      </div>
      {error && <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
    </section>
  );
}