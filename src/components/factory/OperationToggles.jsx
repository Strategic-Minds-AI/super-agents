import React from "react";
import { Search, Share2, Video, FileCheck, Zap } from "lucide-react";

const OPS = [
  { key: "google_connect", label: "Google Auto-Connect", desc: "GSC verify, sitemap submit, indexing request, GA4 setup", icon: Search },
  { key: "social_connect", label: "Social Media Engine", desc: "Auto-connect platforms, auto-post, auto-manage", icon: Share2 },
  { key: "video_generate", label: "Video Factory", desc: "Generate videos, auto-upload to YouTube + socials", icon: Video },
  { key: "content_optimize", label: "Content Intelligence", desc: "Auto-analyze + adjust for Google 100% score", icon: FileCheck }
];

export default function OperationToggles({ form, setForm }) {
  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }));

  return (
    <section className="xa-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><Zap className="w-5 h-5 text-[#B8C5D6]" /></div>
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Operations</h2>
          <p className="text-xs text-white/50">Toggle what runs on every site in the batch</p>
        </div>
      </div>

      <div className="space-y-2">
        {OPS.map(op => {
          const on = form[op.key];
          const Icon = op.icon;
          return (
            <button key={op.key} onClick={() => toggle(op.key)} className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${on ? "border-[#8BA5C0] bg-[#1a1a1a]/30" : "border-[#2a2a2a] bg-[#171717]"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-[#8BA5C0]" : "bg-[#212121] border border-[#2a2a2a]"}`}>
                <Icon className={`w-4 h-4 ${on ? "text-white" : "text-white/40"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm">{op.label}</div>
                <div className="text-xs text-white/45 truncate">{op.desc}</div>
              </div>
              <div className={`w-10 h-6 rounded-full shrink-0 relative transition-colors ${on ? "bg-[#8BA5C0]" : "bg-[#3a3a3a]"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#212121] shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}