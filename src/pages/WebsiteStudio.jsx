import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Globe, Mail, Rocket, Pencil, Settings2, Plus, ArrowLeft, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import StudioSiteCard from "@/components/studio/StudioSiteCard";
import StudioEnquiryDrawer from "@/components/studio/StudioEnquiryDrawer";
import StudioEditor from "@/components/studio/StudioEditor";
import StudioBuilder from "@/components/studio/StudioBuilder";
import StudioManager from "@/components/studio/StudioManager";

const TABS = [
  { id: "sites", label: "My Sites", icon: Globe },
  { id: "build", label: "Build New", icon: Plus },
];

export default function WebsiteStudio() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("sites");
  const [sites, setSites] = useState([]);
  const [enquiryCounts, setEnquiryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("gallery");
  const [activeSite, setActiveSite] = useState(null);
  const [deploying, setDeploying] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [siteRes, counts] = await Promise.all([
        base44.entities.SystemBuild.filter({ build_type: "website" }, { sort: "-created_date", limit: 50 }),
        base44.entities.WebsiteEnquiry.aggregate({ groupBy: "build_id" }),
      ]);
      setSites(siteRes.items || []);
      setEnquiryCounts(Object.fromEntries((counts.rows || []).map(r => [r.build_id, r.count])));
    } catch { setSites([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { const i = setInterval(() => setRefreshKey(k => k + 1), 20000); return () => clearInterval(i); }, []);

  const redeploy = async (site) => {
    setDeploying(site.id);
    try {
      await base44.functions.invoke("runWebsiteBuilder", {
        niche: site.title, style: site.how_it_looks || "modern professional",
        business_name: site.title, build_id: site.id,
      });
      setRefreshKey(k => k + 1);
    } catch {}
    setDeploying(null);
  };

  const openEditor = (site) => { setActiveSite(site); setView("edit"); };
  const openManager = (site) => { setActiveSite(site); setView("manage"); };
  const back = () => { setActiveSite(null); setView("gallery"); setRefreshKey(k => k + 1); };

  const liveCount = sites.filter(s => s.status === "delivered" && s.deployment_url).length;
  const totalEnquiries = Object.values(enquiryCounts).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="xa-pill-badge">WEBSITE STUDIO</span>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-black mt-1 truncate">Website Studio — Edit, Build & Manage</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("/website-factory")} className="xa-btn-outline text-xs px-3 py-2">Factory</button>
            <button onClick={() => navigate("/")} className="xa-btn-outline text-xs px-3 py-2">← Home</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {view === "gallery" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="xa-card p-4 text-center"><Globe className="w-5 h-5 mx-auto text-[#CCBB00]" /><div className="font-heading font-black text-2xl text-black mt-1">{liveCount}</div><div className="text-[10px] font-bold text-black/40 uppercase">Live Sites</div></div>
              <div className="xa-card p-4 text-center"><Mail className="w-5 h-5 mx-auto text-[#CCBB00]" /><div className="font-heading font-black text-2xl text-black mt-1">{totalEnquiries}</div><div className="text-[10px] font-bold text-black/40 uppercase">Enquiries</div></div>
              <div className="xa-card p-4 text-center"><Rocket className="w-5 h-5 mx-auto text-[#CCBB00]" /><div className="font-heading font-black text-2xl text-black mt-1">{sites.length}</div><div className="text-[10px] font-bold text-black/40 uppercase">Total Builds</div></div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${active ? "border-transparent text-black" : "border-[#E5E7EB] text-black/50 hover:border-[#FFEA00] hover:text-black"}`}
                    style={active ? { background: "linear-gradient(135deg,#FFF7B3,#FFEA00 20%,#E6D400 45%,#FFEE33 65%,#FFEA00 80%,#CCBB00)", boxShadow: "inset 0 1px #fff6, inset 0 -1px #8c6e0040, 0 1px 3px #00000026" } : {}}>
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "sites" && (
              loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#CCBB00]" /></div>
              ) : sites.length === 0 ? (
                <div className="xa-card p-12 text-center">
                  <Globe className="w-12 h-12 mx-auto text-black/15" />
                  <h2 className="font-heading font-bold text-lg text-black mt-4">No websites yet</h2>
                  <p className="text-sm text-black/50 mt-1 max-w-sm mx-auto">Build your first website — it'll show up here ready to edit, manage, and track.</p>
                  <button onClick={() => setTab("build")} className="xa-btn-primary mt-5"><Plus className="w-4 h-4" /> Build your first site</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sites.map(s => (
                    <div key={s.id} className="space-y-2">
                      <StudioSiteCard site={s} enquiryCount={enquiryCounts[s.id] || 0} onSelect={setSelected} onRedeploy={redeploy} deploying={deploying === s.id} />
                      <div className="flex gap-2">
                        <button onClick={() => openEditor(s)} disabled={!s.source_html} className="xa-btn-primary text-xs px-3 py-2 flex-1 justify-center" style={!s.source_html ? { opacity: 0.4 } : {}}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => openManager(s)} className="xa-btn-outline text-xs px-3 py-2 flex-1 justify-center">
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "build" && <StudioBuilder onBuilt={() => setRefreshKey(k => k + 1)} />}
          </>
        )}

        {view === "edit" && activeSite && (
          <>
            <button onClick={back} className="xa-btn-outline text-xs px-3 py-2"><ArrowLeft className="w-3.5 h-3.5" /> Back to sites</button>
            <StudioEditor site={activeSite} onBack={back} onSaved={() => setRefreshKey(k => k + 1)} />
          </>
        )}

        {view === "manage" && activeSite && (
          <>
            <button onClick={back} className="xa-btn-outline text-xs px-3 py-2"><ArrowLeft className="w-3.5 h-3.5" /> Back to sites</button>
            <div className="xa-card p-4 flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#CCBB00] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-heading font-bold text-sm text-black truncate">{activeSite.title}</div>
                {activeSite.deployment_url && <a href={activeSite.deployment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#CCBB00] hover:underline truncate"><ExternalLink className="w-3 h-3" />{activeSite.deployment_url.replace("https://", "")}</a>}
              </div>
            </div>
            <StudioManager site={activeSite} onSaved={() => setRefreshKey(k => k + 1)} />
          </>
        )}
      </main>

      {selected && <StudioEnquiryDrawer site={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}