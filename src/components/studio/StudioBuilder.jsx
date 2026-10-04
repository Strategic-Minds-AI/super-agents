import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Rocket, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

const STYLES = ["modern professional", "warm and friendly", "minimal clean", "bold vibrant", "luxury elegant", "playful colorful", "dark sleek"];

export default function StudioBuilder({ onBuilt }) {
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const build = async () => {
    if (!niche.trim()) return;
    setBuilding(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("runWebsiteBuilder", {
        niche: niche.trim(), style, business_name: businessName.trim(),
      });
      const data = res.data || res;
      if (data.error && !data.deploy_url) throw new Error(data.error);
      setResult(data);
      onBuilt?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Build failed.");
    }
    setBuilding(false);
  };

  return (
    <div className="xa-card p-5 max-w-xl mx-auto">
      <h2 className="font-heading font-bold text-lg text-black">Build a New Website</h2>
      <p className="text-xs text-black/50 mt-0.5">Generate a complete site and deploy it live — it'll appear in your Studio gallery.</p>

      <div className="space-y-3 mt-4">
        <input className="xa-input" placeholder="Business name (optional)" value={businessName} onChange={e => setBusinessName(e.target.value)} disabled={building} />
        <input className="xa-input" placeholder="Niche: dental practice, plumbing, landscaping…" value={niche} onChange={e => setNiche(e.target.value)} disabled={building} />
        <select className="xa-input" value={style} onChange={e => setStyle(e.target.value)} disabled={building}>
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={build} disabled={building || !niche.trim()} className="xa-btn-primary w-full py-3">
          {building ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating & deploying…</> : <><Rocket className="w-4 h-4" /> Build & Deploy</>}
        </button>

        {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {result && result.deploy_url && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs font-bold text-green-700">Live!</span></div>
            <a href={result.deploy_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 truncate"><ExternalLink className="w-3 h-3" />{result.deploy_url}</a>
          </div>
        )}
      </div>
    </div>
  );
}