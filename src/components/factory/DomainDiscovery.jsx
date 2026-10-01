import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Globe, CheckCircle2, XCircle } from "lucide-react";

const TLDS = ["com", "net", "org", "store", "online", "site", "blog", "co", "io", "ai", "tech", "biz", "xyz"];

export default function DomainDiscovery({ onDiscovered }) {
  const [keywords, setKeywords] = useState("");
  const [selectedTlds, setSelectedTlds] = useState(["com", "net", "store", "online"]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleTld = (t) => setSelectedTlds(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const discover = async () => {
    if (!keywords.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await base44.functions.invoke("runDomainDiscovery", { keywords, tlds: selectedTlds.join(",") });
      setResults(res.data || res);
      if (onDiscovered) onDiscovered(res.data || res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <section className="xa-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#FFF7B3] flex items-center justify-center"><Globe className="w-5 h-5 text-[#8A7300]" /></div>
        <div>
          <h2 className="font-heading font-bold text-lg text-black">Domain Discovery & Buyer</h2>
          <p className="text-xs text-black/50">Auto-discover available domains across all TLDs</p>
        </div>
      </div>

      <div className="space-y-3">
        <input className="xa-input" placeholder="Keywords: dental, plumber, lawyer, restaurant…" value={keywords} onChange={e => setKeywords(e.target.value)} />

        <div className="flex flex-wrap gap-1.5">
          {TLDS.map(t => (
            <button key={t} onClick={() => toggleTld(t)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${selectedTlds.includes(t) ? "border-transparent text-black" : "border-[#E5E7EB] text-black/40"}`}
              style={selectedTlds.includes(t) ? { background: "linear-gradient(135deg,#FFF7B3,#FFEA00 20%,#E6D400 45%,#FFEE33 65%,#FFEA00 80%,#CCBB00)" } : {}}>
              .{t}
            </button>
          ))}
        </div>

        <button onClick={discover} disabled={loading || !keywords.trim()} className="xa-btn-primary w-full">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Discovering…</> : <><Search className="w-4 h-4" /> Discover domains</>}
        </button>

        {error && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

        {results && (
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7EB]">
            <div className="text-xs font-bold text-black/60 mb-2">{results.available_count || 0} available of {results.candidates_checked || 0} checked</div>
            <div className="space-y-1 max-h-48 overflow-y-auto xa-scroll">
              {(results.available_domains || []).slice(0, 30).map(d => (
                <div key={d} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="font-mono text-black truncate">{d}</span>
                  <button className="ml-auto text-[10px] font-bold text-[#CCBB00] hover:underline shrink-0">Buy</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}