import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Globe, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";

const STATUS_STYLE = {
  onboarding: "bg-[#1a1a1a] text-[#B8C5D6]",
  verifying: "bg-[#1a1a2a] text-blue-400",
  verified: "bg-[#0d1f0d] text-emerald-400",
  active: "bg-[#0d1f0d] text-emerald-400",
  issues: "bg-[#1f0d0d] text-red-400",
  paused: "bg-[#212121] text-[#7f7f7f]"
};

export default function DomainRegistry() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Domain.filter({}, { sort: "-created_date", limit: 50 });
      setDomains(res.items || []);
    } catch (e) { setDomains([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addDomain = async () => {
    const d = newDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d || adding) return;
    setAdding(true);
    try {
      await base44.entities.Domain.create({ domain: d, canonical_url: `https://${d}`, status: "onboarding" });
      setNewDomain("");
      await load();
      navigate(`/agents/growth_operator`);
    } catch (e) {}
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-[#171717]">
      <header className="border-b border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <span className="xa-pill-badge">GROWTH OPERATOR</span>
            <h1 className="font-heading font-black text-3xl text-white mt-2">Domain Registry</h1>
            <p className="text-white/55 mt-1">Every URL the Growth Operator manages end to end.</p>
          </div>
          <button onClick={() => navigate("/")} className="xa-btn-outline">← Command Center</button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="xa-card p-6 mb-8">
          <h2 className="font-heading font-bold text-lg text-white mb-1">Add a domain</h2>
          <p className="text-sm text-white/55 mb-4">Drop a URL. The Growth Operator takes it from intake through Google connection, sitemaps, indexing, competitors and monitoring.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDomain()}
              placeholder="benearme.com" className="xa-input flex-1" />
            <button onClick={addDomain} disabled={adding || !newDomain.trim()} className="xa-btn-primary">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add & onboard</>}
            </button>
          </div>
        </div>

        <h2 className="font-heading font-bold text-xl text-white mb-4">Registered domains</h2>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#5B7FA8]" /></div>
        ) : domains.length === 0 ? (
          <div className="xa-card p-12 text-center">
            <Globe className="w-10 h-10 mx-auto text-white/20" />
            <p className="text-white/50 mt-3">No domains yet. Add your first URL above to activate the Growth Operator.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {domains.map((d) => (
              <div key={d.id} className="xa-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><Globe className="w-5 h-5 text-[#B8C5D6]" /></div>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{d.domain}</div>
                    <div className="text-xs text-white/45 truncate">{d.canonical_url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm">
                    <div className="text-white/40 text-xs uppercase tracking-wide">Health</div>
                    <div className="font-bold text-white">{d.health_score != null ? `${d.health_score}/100` : "—"}</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[d.status] || "bg-[#212121] text-[#7f7f7f]"}`}>{d.status}</span>
                  <button onClick={() => navigate("/agents/growth_operator")} className="text-[#5B7FA8] hover:text-white"><ExternalLink className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}