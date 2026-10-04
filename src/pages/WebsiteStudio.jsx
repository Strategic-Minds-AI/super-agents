import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, Globe, Mail, Rocket, Factory } from "lucide-react";
import StudioSiteCard from "@/components/studio/StudioSiteCard";
import StudioEnquiryDrawer from "@/components/studio/StudioEnquiryDrawer";

export default function WebsiteStudio() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [enquiryCounts, setEnquiryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
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
  useEffect(() => { const i = setInterval(() => setRefreshKey(k => k + 1), 15000); return () => clearInterval(i); }, []);

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

  const liveCount = sites.filter(s => s.status === "delivered" && s.deployment_url).length;
  const totalEnquiries = Object.values(enquiryCounts).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="xa-pill-badge">WEBSITE STUDIO</span>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-black mt-1 truncate">Your Live Website Studio</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("/website-factory")} className="xa-btn-outline text-xs px-3 py-2"><Factory className="w-3.5 h-3.5" /> Factory</button>
            <button onClick={() => navigate("/")} className="xa-btn-outline text-xs px-3 py-2">← Home</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="xa-card p-4 text-center">
            <Globe className="w-5 h-5 mx-auto text-[#CCBB00]" />
            <div className="font-heading font-black text-2xl text-black mt-1">{liveCount}</div>
            <div className="text-[10px] font-bold text-black/40 uppercase">Live Sites</div>
          </div>
          <div className="xa-card p-4 text-center">
            <Mail className="w-5 h-5 mx-auto text-[#CCBB00]" />
            <div className="font-heading font-black text-2xl text-black mt-1">{totalEnquiries}</div>
            <div className="text-[10px] font-bold text-black/40 uppercase">Enquiries</div>
          </div>
          <div className="xa-card p-4 text-center">
            <Rocket className="w-5 h-5 mx-auto text-[#CCBB00]" />
            <div className="font-heading font-black text-2xl text-black mt-1">{sites.length}</div>
            <div className="text-[10px] font-bold text-black/40 uppercase">Total Builds</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#CCBB00]" /></div>
        ) : sites.length === 0 ? (
          <div className="xa-card p-12 text-center">
            <Globe className="w-12 h-12 mx-auto text-black/15" />
            <h2 className="font-heading font-bold text-lg text-black mt-4">No websites yet</h2>
            <p className="text-sm text-black/50 mt-1 max-w-sm mx-auto">Build your first website from the Factory — it'll show up here with a live preview and enquiry inbox.</p>
            <button onClick={() => navigate("/website-factory")} className="xa-btn-primary mt-5"><Factory className="w-4 h-4" /> Go to Factory</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map(s => (
              <StudioSiteCard
                key={s.id}
                site={s}
                enquiryCount={enquiryCounts[s.id] || 0}
                onSelect={setSelected}
                onRedeploy={redeploy}
                deploying={deploying === s.id}
              />
            ))}
          </div>
        )}
      </main>

      {selected && <StudioEnquiryDrawer site={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}