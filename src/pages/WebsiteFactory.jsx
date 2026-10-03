import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Rocket, Factory } from "lucide-react";
import PipelineOverview from "@/components/factory/PipelineOverview";
import DomainDiscovery from "@/components/factory/DomainDiscovery";
import TemplateGenerator from "@/components/factory/TemplateGenerator";
import RepoGenerator from "@/components/factory/RepoGenerator";
import SandboxPanel from "@/components/factory/SandboxPanel";
import IntegrationStack from "@/components/factory/IntegrationStack";
import CostOptimizer from "@/components/factory/CostOptimizer";

export default function WebsiteFactory() {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("discover");
  const [freeMode, setFreeMode] = useState(true);

  const launchFull = async () => {
    setLaunching(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("runBatchOperation", {
        name: "Factory Pipeline", batch_size: 10, template: {}, variables: "[]",
        deploy_targets: freeMode ? ["github"] : ["railway", "github"],
        google_connect: true, social_connect: true, video_generate: !freeMode, content_optimize: true,
        free_mode: freeMode
      });
      setResult(res.data || res);
    } catch (e) { setError(e.message); }
    setLaunching(false);
  };

  return (
    <div className="min-h-screen bg-[#171717]">
      <header className="border-b border-[#2a2a2a] bg-[#212121] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="xa-pill-badge">WEBSITE FACTORY</span>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-white mt-1 truncate">Full AI-Enhanced Website Factory</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("/batch")} className="xa-btn-outline text-xs px-3 py-2">⚡ Batch</button>
            <button onClick={() => navigate("/")} className="xa-btn-outline text-xs px-3 py-2">← Home</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <CostOptimizer freeMode={freeMode} setFreeMode={setFreeMode} />
        <PipelineOverview activeStage={stage} />
        <IntegrationStack />
        <DomainDiscovery onDiscovered={() => setStage("buy")} />
        <TemplateGenerator onGenerated={() => setStage("generate")} />
        <RepoGenerator onCreated={() => setStage("build")} />
        <SandboxPanel />

        <button onClick={launchFull} disabled={launching} className="xa-btn-primary w-full py-4 text-base">
          {launching ? <><Loader2 className="w-5 h-5 animate-spin" /> Launching full pipeline…</> : <><Rocket className="w-5 h-5" /> Launch full factory pipeline</>}
        </button>

        {result && (
          <div className="xa-card p-4 bg-[#0d1f0d] border-green-800">
            <div className="font-bold text-green-400 text-sm">Pipeline dispatched!</div>
            <div className="text-xs text-white/60 mt-1">{result.sites || result.batch_size} sites · {result.tasks_dispatched} autonomous tasks queued.</div>
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-[#1f0d0d] border border-red-800 text-sm text-red-400">{error}</div>}

        <div className="xa-card p-4 bg-[#1a1a1a]/30 border-[#2a2a2a]/30">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white">The full stack:</strong> Discover domains across all TLDs → buy via GoDaddy → AI-generate templates → create GitHub repos → build with Base44 → deploy to Vercel + Railway → connect Supabase backend → store data in Drive → auto-connect Google + social → auto-post → auto-analyze → auto-optimize. All from this one page. The worker executes every phase autonomously.
          </p>
        </div>
      </main>
    </div>
  );
}