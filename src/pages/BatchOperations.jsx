import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Rocket, ArrowRight } from "lucide-react";
import BatchBuilder from "@/components/factory/BatchBuilder";
import OperationToggles from "@/components/factory/OperationToggles";
import BatchHistory from "@/components/factory/BatchHistory";

export default function BatchOperations() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", batch_size: 10, template: {}, variables: "[]", deploy_targets: ["railway"],
    google_connect: true, social_connect: true, video_generate: false, content_optimize: true
  });
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const launch = async () => {
    if (!form.name.trim()) return;
    setLaunching(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("runBatchOperation", form);
      setResult(res.data || res);
      setRefreshKey(k => k + 1);
    } catch (e) { setError(e.message); }
    setLaunching(false);
  };

  return (
    <div className="min-h-screen bg-[#171717]">
      <header className="border-b border-[#2a2a2a] bg-[#212121] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="xa-pill-badge">BATCH OPERATIONS</span>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-white mt-1 truncate">1000 Sites. One Day. One Page.</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("/website-factory")} className="xa-btn-primary text-xs px-3 py-2">🏭 Factory</button>
            <button onClick={() => navigate("/factory")} className="xa-btn-outline text-xs px-3 py-2">← System</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <BatchBuilder form={form} setForm={setForm} />
        <OperationToggles form={form} setForm={setForm} />

        <button onClick={launch} disabled={launching || !form.name.trim()} className="xa-btn-primary w-full py-4 text-base">
          {launching ? <><Loader2 className="w-5 h-5 animate-spin" /> Dispatching batch…</> : <><Rocket className="w-5 h-5" /> Launch {form.batch_size} sites →</>}
        </button>

        {result && (
          <div className="xa-card p-4 bg-[#0d1f0d] border-green-800">
            <div className="font-bold text-green-400 text-sm">Batch dispatched!</div>
            <div className="text-xs text-white/60 mt-1">{result.sites || result.batch_size} sites · {result.tasks_dispatched} autonomous tasks queued across all phases.</div>
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-[#1f0d0d] border border-red-800 text-sm text-red-400">{error}</div>}

        <BatchHistory refreshKey={refreshKey} />

        <div className="xa-card p-4 bg-[#1a1a1a]/30 border-[#2a2a2a]/30">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white">How it works:</strong> Define a template with {"{variables}"}, set your batch size, toggle which operations run (Google connect, social, video, content optimization), and launch. The backend dispatches autonomous tasks for every site × every phase. The worker picks them up and executes — build → deploy → connect → post → analyze → optimize — all hands-free. Use the Worker Fleet to scale execution across multiple workers.
          </p>
        </div>
      </main>
    </div>
  );
}