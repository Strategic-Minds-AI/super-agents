import React from "react";
import { ExternalLink, Mail, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

const STATUS_META = {
  delivered: { color: "#16A34A", bg: "#DCFCE7", label: "Live" },
  building: { color: "#2563EB", bg: "#DBEAFE", label: "Building" },
  deploying: { color: "#7C3AED", bg: "#EDE9FE", label: "Deploying" },
  planning: { color: "#2563EB", bg: "#DBEAFE", label: "Planning" },
  spec_submitted: { color: "#8A7300", bg: "#FFF7B3", label: "Queued" },
  failed: { color: "#DC2626", bg: "#FEE2E2", label: "Failed" },
};

export default function StudioSiteCard({ site, enquiryCount, onSelect, onRedeploy, deploying }) {
  const meta = STATUS_META[site.status] || STATUS_META.spec_submitted;
  const isLive = site.status === "delivered" && site.deployment_url;

  return (
    <article className="xa-card overflow-hidden flex flex-col">
      <div className="relative bg-[#FAFAFA] border-b border-[#E5E7EB]" style={{ height: 180 }}>
        {isLive ? (
          <iframe src={site.deployment_url} title={`${site.title} preview`} className="w-full h-full" style={{ border: 0, pointerEvents: "none" }} loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {site.status === "failed" ? (
              <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
                <p className="text-xs text-red-600 line-clamp-2">{site.last_error || "Build failed"}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#CCBB00]" />
                <p className="text-xs text-black/40">{site.build_stage || "Waiting…"}</p>
              </div>
            )}
          </div>
        )}
        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-sm text-black truncate">{site.title}</h3>
          {site.deployment_url && (
            <a href={site.deployment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#CCBB00] hover:underline mt-0.5 truncate max-w-full">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{site.deployment_url.replace("https://", "")}</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button onClick={() => onSelect(site)} className="flex items-center gap-1 text-black/60 hover:text-black font-semibold">
            <Mail className="w-3.5 h-3.5" />
            {enquiryCount} {enquiryCount === 1 ? "enquiry" : "enquiries"}
          </button>
        </div>

        <div className="flex gap-2 mt-auto">
          {isLive && (
            <a href={site.deployment_url} target="_blank" rel="noopener noreferrer" className="xa-btn-outline text-xs px-3 py-2 flex-1 justify-center">
              <ExternalLink className="w-3.5 h-3.5" /> Visit
            </a>
          )}
          <button onClick={() => onRedeploy(site)} disabled={deploying} className="xa-btn-primary text-xs px-3 py-2 flex-1 justify-center">
            {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Re-deploy
          </button>
        </div>
      </div>
    </article>
  );
}