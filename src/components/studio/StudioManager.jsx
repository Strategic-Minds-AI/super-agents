import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Save, Globe, Search, CheckCircle2, AlertCircle, Link2 } from "lucide-react";

export default function StudioManager({ site, onSaved }) {
  const [customDomain, setCustomDomain] = useState(site.custom_domain || "");
  const [metaTitle, setMetaTitle] = useState(site.meta_title || "");
  const [metaDesc, setMetaDesc] = useState(site.meta_description || "");
  const [keywords, setKeywords] = useState(site.target_keywords || "");
  const [competitors, setCompetitors] = useState(site.competitors || "");
  const [savingSeo, setSavingSeo] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setCustomDomain(site.custom_domain || "");
    setMetaTitle(site.meta_title || "");
    setMetaDesc(site.meta_description || "");
    setKeywords(site.target_keywords || "");
    setCompetitors(site.competitors || "");
  }, [site.id]);

  const saveSeo = async () => {
    setSavingSeo(true); setMsg(null);
    try {
      await base44.entities.SystemBuild.update(site.id, {
        meta_title: metaTitle, meta_description: metaDesc,
        target_keywords: keywords, competitors,
      });
      setMsg({ type: "ok", text: "SEO details saved." });
      onSaved?.();
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    setSavingSeo(false);
  };

  const connectDomain = async () => {
    if (!customDomain.trim()) return;
    setSavingDomain(true); setMsg(null);
    try {
      const res = await base44.functions.invoke("redeployWebsite", {
        build_id: site.id, html: site.source_html, custom_domain: customDomain.trim(),
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setMsg({ type: "ok", text: `Domain assigned to Vercel project (${data.custom_domain_status || "ok"}). Update your DNS to point to Vercel.` });
      onSaved?.();
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    setSavingDomain(false);
  };

  const runAudit = async () => {
    setAuditing(true); setMsg(null);
    try {
      await base44.entities.AgentTask.create({
        agent_name: "growth_operator",
        task_type: "audit_seo",
        domain: customDomain || site.deployment_url || site.title,
        title: `SEO audit: ${site.title}`,
        description: JSON.stringify({ site_id: site.id, domain: customDomain || site.deployment_url, keywords, competitors }),
        priority: "high", autonomous: true, status: "pending",
      });
      await base44.entities.SystemBuild.update(site.id, { seo_status: "auditing" });
      setMsg({ type: "ok", text: "SEO audit dispatched. The Growth Operator will run it autonomously." });
      onSaved?.();
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    setAuditing(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="xa-card p-5">
        <div className="flex items-center gap-2 mb-3"><Globe className="w-4 h-4 text-[#CCBB00]" /><h3 className="font-heading font-bold text-sm text-black">Custom Domain</h3></div>
        <input className="xa-input" placeholder="mysite.com" value={customDomain} onChange={e => setCustomDomain(e.target.value)} />
        <p className="text-[10px] text-black/40 mt-1.5">Assigns the domain to your Vercel project and re-deploys. Then add the Vercel DNS records at your registrar.</p>
        <button onClick={connectDomain} disabled={savingDomain || !customDomain.trim()} className="xa-btn-primary w-full py-2.5 mt-3">
          {savingDomain ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><Link2 className="w-4 h-4" /> Connect & Re-deploy</>}
        </button>
      </div>

      <div className="xa-card p-5">
        <div className="flex items-center gap-2 mb-3"><Search className="w-4 h-4 text-[#CCBB00]" /><h3 className="font-heading font-bold text-sm text-black">SEO Settings</h3></div>
        <label className="text-xs font-semibold text-black/50 mb-1 block">Meta title</label>
        <input className="xa-input mb-3" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Page title" />
        <label className="text-xs font-semibold text-black/50 mb-1 block">Meta description</label>
        <textarea className="xa-input mb-3" style={{ height: 64 }} value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="Meta description" />
        <label className="text-xs font-semibold text-black/50 mb-1 block">Target keywords (comma-separated)</label>
        <input className="xa-input mb-3" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="dentist near me, teeth whitening" />
        <label className="text-xs font-semibold text-black/50 mb-1 block">Competitors (comma-separated domains)</label>
        <input className="xa-input mb-3" value={competitors} onChange={e => setCompetitors(e.target.value)} placeholder="competitor1.com, competitor2.com" />
        <button onClick={saveSeo} disabled={savingSeo} className="xa-btn-outline w-full py-2.5">
          {savingSeo ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save SEO Details</>}
        </button>
      </div>

      <div className="xa-card p-5">
        <div className="flex items-center gap-2 mb-2"><Search className="w-4 h-4 text-[#CCBB00]" /><h3 className="font-heading font-bold text-sm text-black">SEO Audit</h3></div>
        <p className="text-xs text-black/50 mb-3">Dispatch the Growth Operator to audit this site's SEO and create remediation tasks autonomously.</p>
        <button onClick={runAudit} disabled={auditing} className="xa-btn-primary w-full py-2.5">
          {auditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching…</> : <><Search className="w-4 h-4" /> Run SEO Audit</>}
        </button>
      </div>

      {msg && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${msg.type === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}