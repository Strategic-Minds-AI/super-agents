import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Layers } from "lucide-react";

const STATUS_META = {
  queued: { color: "#B8C5D6", bg: "#1a1a1a", label: "Queued" },
  dispatching: { color: "#2563EB", bg: "#0d1a2a", label: "Dispatching" },
  running: { color: "#2563EB", bg: "#0d1a2a", label: "Running" },
  complete: { color: "#16A34A", bg: "#0d1f0d", label: "Complete" },
  failed: { color: "#DC2626", bg: "#2a0d0d", label: "Failed" }
};

export default function BatchHistory({ refreshKey }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.entities.BatchOperation.filter({}, { sort: "-created_date", limit: 20 });
      setBatches(res.items || []);
    } catch (e) { setBatches([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  return (
    <section className="xa-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><Layers className="w-5 h-5 text-[#B8C5D6]" /></div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">Batch History</h2>
            <p className="text-xs text-white/50">All mass operations — past + active</p>
          </div>
        </div>
        <button onClick={load} className="text-white/50 hover:text-white"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      {loading ? <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#5B7FA8]" /></div> : batches.length === 0 ? (
        <div className="text-center py-6"><Layers className="w-8 h-8 mx-auto text-white/20" /><p className="text-sm text-white/50 mt-2">No batches yet. Configure + launch one above.</p></div>
      ) : (
        <div className="space-y-2">
          {batches.map(b => {
            const meta = STATUS_META[b.status] || STATUS_META.queued;
            return (
              <div key={b.id} className="p-3 rounded-xl bg-[#171717] border border-[#2a2a2a]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm truncate">{b.name}</div>
                    <div className="text-xs text-white/45">{b.batch_size} sites · {b.task_count} tasks · {b.progress || 0}%</div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-white/50">
                  {b.google_connect && <span>🔍 Google</span>}
                  {b.social_connect && <span>📱 Social</span>}
                  {b.video_generate && <span>🎬 Video</span>}
                  {b.content_optimize && <span>✨ Content</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}