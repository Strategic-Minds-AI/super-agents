import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, FileCode } from "lucide-react";

export default function TemplateGenerator({ onGenerated }) {
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!niche.trim()) return;
    setLoading(true); setError(null); setTemplate(null);
    try {
      const res = await base44.functions.invoke("runTemplateGenerator", { niche, style });
      setTemplate(res.data || res);
      if (onGenerated) onGenerated(res.data || res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <section className="xa-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><FileCode className="w-5 h-5 text-[#B8C5D6]" /></div>
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Auto Template Generator</h2>
          <p className="text-xs text-white/50">AI generates a full website template spec from your niche</p>
        </div>
      </div>

      <div className="space-y-3">
        <input className="xa-input" placeholder="Niche: dental practice, plumbing, legal services…" value={niche} onChange={e => setNiche(e.target.value)} />
        <input className="xa-input" placeholder="Style: modern, professional, warm, minimal…" value={style} onChange={e => setStyle(e.target.value)} />

        <button onClick={generate} disabled={loading || !niche.trim()} className="xa-btn-primary w-full">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating template…</> : <><Sparkles className="w-4 h-4" /> Generate template</>}
        </button>

        {error && <div className="p-2 rounded-lg bg-[#1f0d0d] border border-red-800 text-xs text-red-400">{error}</div>}

        {template && template.template && (
          <div className="p-3 rounded-xl bg-[#171717] border border-[#2a2a2a]">
            <div className="text-xs font-bold text-white mb-2">{template.template.title || "Generated template"}</div>
            <div className="space-y-1 max-h-48 overflow-y-auto xa-scroll text-xs">
              {Object.entries(template.template).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-bold text-[#5B7FA8] shrink-0">{k}:</span>
                  <span className="text-white/60 truncate">{typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}