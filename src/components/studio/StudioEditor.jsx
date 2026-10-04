import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Save, ArrowLeft, Type, Palette, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";

const EDIT_SCRIPT = `<script id="studio-edit-script">(function(){var t=['h1','h2','h3','h4','h5','h6','p','li','a','span','blockquote','figcaption','label','button','strong','em','td'];document.querySelectorAll(t.join(',')).forEach(function(el){el.contentEditable='true';});var s=document.createElement('style');s.id='studio-edit-style';s.textContent='[contenteditable]:hover{outline:2px dashed #FFEA00!important;outline-offset:2px;cursor:text}[contenteditable]:focus{outline:2px solid #FFEA00!important;outline-offset:2px}';document.head.appendChild(s);})();</script>`;

function withEditScript(html) {
  if (!html) return "";
  return html.replace(/<\/body>/i, EDIT_SCRIPT + "</body>");
}

export default function StudioEditor({ site, onBack, onSaved }) {
  const iframeRef = useRef(null);
  const [metaTitle, setMetaTitle] = useState(site.meta_title || "");
  const [metaDesc, setMetaDesc] = useState(site.meta_description || "");
  const [primary, setPrimary] = useState("#FFEA00");
  const [accent, setAccent] = useState("#000000");
  const [bg, setBg] = useState("#FFFFFF");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hasSource, setHasSource] = useState(!!site.source_html);

  useEffect(() => {
    setHasSource(!!site.source_html);
    setMetaTitle(site.meta_title || "");
    setMetaDesc(site.meta_description || "");
  }, [site.id, site.source_html, site.meta_title, site.meta_description]);

  // Sync meta tags into the iframe live
  const applyMeta = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    if (metaTitle) doc.title = metaTitle;
    let m = doc.querySelector('meta[name="description"]');
    if (!m) { m = doc.createElement("meta"); m.setAttribute("name", "description"); doc.head.appendChild(m); }
    m.setAttribute("content", metaDesc);
  }, [metaTitle, metaDesc]);

  const applyTheme = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    let st = doc.getElementById("studio-theme");
    if (!st) { st = doc.createElement("style"); st.id = "studio-theme"; doc.head.appendChild(st); }
    st.textContent = `:root{--primary:${primary};--accent:${accent};--brand-primary:${primary};--brand-accent:${accent};--color-primary:${primary};--main-color:${primary};--primary-color:${primary};}`;
  }, [primary, accent, bg]);

  const onIframeLoad = useCallback(() => {
    applyMeta();
    applyTheme();
  }, [applyMeta, applyTheme]);

  useEffect(() => { applyMeta(); }, [metaTitle, metaDesc, applyMeta]);
  useEffect(() => { applyTheme(); }, [primary, accent, applyTheme]);

  const save = async () => {
    setSaving(true); setError(null); setResult(null);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) throw new Error("Editor not ready.");
      // Strip editing artifacts
      doc.getElementById("studio-edit-script")?.remove();
      doc.getElementById("studio-edit-style")?.remove();
      doc.getElementById("studio-theme")?.remove();
      doc.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
      const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

      const res = await base44.functions.invoke("redeployWebsite", {
        build_id: site.id, html,
        meta_title: metaTitle, meta_description: metaDesc,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setResult(data);
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Re-deploy failed.");
    }
    setSaving(false);
  };

  if (!hasSource) {
    return (
      <div className="xa-card p-8 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-black/15" />
        <h3 className="font-heading font-bold text-base text-black mt-3">No editable source</h3>
        <p className="text-sm text-black/50 mt-1 max-w-sm mx-auto">This site was built before the Studio editor. Re-deploy it once from the Factory to enable visual editing.</p>
        <button onClick={onBack} className="xa-btn-outline mt-4"><ArrowLeft className="w-4 h-4" /> Back to sites</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <div className="xa-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <button onClick={onBack} className="p-1.5 rounded hover:bg-white"><ArrowLeft className="w-4 h-4" /></button>
          <span className="text-xs font-bold text-black/60 truncate">{site.title}</span>
          <span className="text-[10px] text-[#8A7300] font-bold uppercase ml-auto">Click any text to edit</span>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={withEditScript(site.source_html)}
          onLoad={onIframeLoad}
          title="Visual editor"
          className="w-full bg-white"
          style={{ height: "70vh", border: 0 }}
        />
      </div>

      <div className="space-y-4">
        <div className="xa-card p-4">
          <div className="flex items-center gap-2 mb-3"><Type className="w-4 h-4 text-[#CCBB00]" /><h3 className="font-heading font-bold text-sm text-black">SEO Meta</h3></div>
          <label className="text-xs font-semibold text-black/50 mb-1 block">Title</label>
          <input className="xa-input mb-3" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Page title" />
          <label className="text-xs font-semibold text-black/50 mb-1 block">Description</label>
          <textarea className="xa-input" style={{ height: 80 }} value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="Meta description" />
        </div>

        <div className="xa-card p-4">
          <div className="flex items-center gap-2 mb-3"><Palette className="w-4 h-4 text-[#CCBB00]" /><h3 className="font-heading font-bold text-sm text-black">Theme</h3></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs text-black/50">Primary</span><input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-[#E5E7EB]" /></div>
            <div className="flex items-center justify-between"><span className="text-xs text-black/50">Accent</span><input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-[#E5E7EB]" /></div>
          </div>
          <p className="text-[10px] text-black/35 mt-2">Applies to sites using CSS variables. Text edits always work.</p>
        </div>

        <button onClick={save} disabled={saving} className="xa-btn-primary w-full py-3">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</> : <><Save className="w-4 h-4" /> Save & Re-deploy</>}
        </button>

        {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {result && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs font-bold text-green-700">Re-deployed!</span></div>
            {result.deploy_url && <a href={result.deploy_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 truncate"><ExternalLink className="w-3 h-3" />{result.deploy_url}</a>}
          </div>
        )}
      </div>
    </div>
  );
}