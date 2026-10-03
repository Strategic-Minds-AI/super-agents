import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Server, Github, Database, Cloud, Train, Container, Loader2, CheckCircle2, XCircle, Copy } from "lucide-react";

const PROVIDERS = [
  { key: "github", label: "GitHub", icon: Github, desc: "Create repo + push code" },
  { key: "supabase", label: "Supabase", icon: Database, desc: "Provision DB + Auth" },
  { key: "vercel", label: "Vercel", icon: Cloud, desc: "Deploy frontend" },
  { key: "railway", label: "Railway", icon: Train, desc: "Deploy backend service" },
  { key: "docker", label: "Docker (Local)", icon: Container, desc: "Generate Dockerfile + compose" },
];

export default function Provisioning() {
  const [name, setName] = useState("");
  const [stack, setStack] = useState("fullstack");
  const [targets, setTargets] = useState({ github: true, supabase: true, vercel: true, railway: true, docker: true });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  const toggle = (k) => setTargets((t) => ({ ...t, [k]: !t[k] }));

  const provision = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("runProvisioning", {
        name: name || "untitled-project",
        stack_type: stack,
        targets: Object.keys(targets).filter((k) => targets[k]),
      });
      setResult(res.data);
    } catch (e) {
      setError(e.message || "Provisioning failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Server className="w-7 h-7 text-[#FFEA00]" />
        <h1 className="font-heading font-bold text-2xl">Infrastructure Provisioning</h1>
      </div>
      <p className="text-muted-foreground mb-8">Provision your system across GitHub, Supabase, Vercel, Railway, and local Docker — one command, full stack.</p>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-super-agent-app"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Stack Type</label>
          <select
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:border-ring"
          >
            <option value="static_site">Static Site</option>
            <option value="vite_app">Vite App</option>
            <option value="fullstack">Fullstack</option>
            <option value="backend_api">Backend API</option>
            <option value="mobile_app">Mobile App</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-3">Provisioning Targets</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  targets[key]
                    ? "border-[#FFEA00]/50 bg-[#FFEA00]/5"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${targets[key] ? "text-[#FFEA00]" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={provision}
          disabled={loading || !Object.values(targets).some(Boolean)}
          className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFF7B3] via-[#FFEA00] to-[#CCBB00] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-105 transition-all"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</> : "🚀 Provision Infrastructure"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          <h2 className="font-heading font-bold text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Provisioning Results
          </h2>

          {/* Provider statuses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.results?.map((r) => (
              <div key={r.target} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  {r.status === "provisioned" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {r.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                  {r.status === "pending" && <Loader2 className="w-4 h-4 text-yellow-500" />}
                  <span className="text-sm font-semibold capitalize">{r.target}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${r.status === "provisioned" ? "bg-green-500/10 text-green-500" : r.status === "failed" ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-[#FFEA00] hover:underline mt-1 block truncate">
                    {r.url}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Docker files */}
          {result.docker_files && (
            <div className="space-y-3">
              {Object.entries(result.docker_files).map(([fname, content]) => (
                <div key={fname} className="rounded-lg border border-border bg-[#0d0d0d] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                    <span className="text-sm font-mono font-semibold text-[#FFEA00]">{fname}</span>
                    <button
                      onClick={() => copy(fname, content)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copied === fname ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto max-h-64">{content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}