import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentCard from "@/components/agents/AgentCard";

const AGENTS = [
  {
    name: "orchestrator", label: "The Orchestrator", icon: "🧠", category: "Apex", apex: true,
    description: "The apex master agent. Give it any business goal — it decomposes the work across stages, dispatches the specialist agents via the action queue, sequences the critical path, and reports a unified mission brief.",
    skills: ["Decompose", "Dispatch", "Sequence", "Track", "Escalate", "Mission Control"]
  },
  {
    name: "growth_operator", label: "Growth Operator", icon: "🛡️", category: "Operate", flagship: true,
    description: "Autonomous Google growth engine — takes any URL end-to-end through Search Console, GA4, GTM, sitemaps, index coverage, competitor intelligence and continuous monitoring.",
    skills: ["Search Console", "GA4", "GTM", "Sitemaps", "Indexing", "Competitors", "Analytics"]
  },
  {
    name: "code_architect", label: "Code Architect", icon: "⚙️", category: "Build",
    description: "Elite staff-engineer pair. Writes, reviews, refactors, debugs and ships production code across the full stack.",
    skills: ["React", "TypeScript", "Python", "Refactor", "Debug", "Tests"]
  },
  {
    name: "social_strategist", label: "Social Strategist", icon: "📣", category: "Grow",
    description: "Owns the full social lifecycle — strategy, platform-native content, calendars, engagement playbooks and performance analysis.",
    skills: ["Instagram", "TikTok", "LinkedIn", "Content", "Calendar", "Engagement"]
  },
  {
    name: "sales_engine", label: "Sales Engine", icon: "🚀", category: "Grow",
    description: "Revenue super-agent from prospect to closed deal — ICPs, outreach sequences, qualification, pipeline, follow-up and closing playbooks.",
    skills: ["Outbound", "Sequences", "MEDDIC", "Pipeline", "Forecasting", "Closing"]
  },
  {
    name: "brand_guardian", label: "Brand Guardian", icon: "✦", category: "Discover",
    description: "Protects and amplifies the brand — voice, messaging, content strategy, copywriting and creative direction across every touchpoint.",
    skills: ["Voice", "Copy", "Content", "Positioning", "Style Guide"]
  }
];

const CATEGORIES = ["All", "Apex", "Discover", "Build", "Grow", "Operate"];

export default function AgentCommandCenter() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? AGENTS : AGENTS.filter((a) => a.category === category);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-[#E5E7EB] bg-gradient-to-b from-[#FFF7B3]/30 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <span className="xa-pill-badge">XTREME AI · OPERATIONS</span>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-black mt-4 leading-tight">Autonomous Agent Command Center</h1>
          <p className="text-lg text-black/60 mt-4 max-w-2xl">A fleet of super-agents engineered like GPT — one for every stage of your business flow. Launch any agent, give it a goal, and it operates end to end.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button onClick={() => navigate("/architect")} className="xa-btn-primary">✦ Launch Meta Architect</button>
            <button onClick={() => navigate("/mission")} className="xa-btn-outline">Growth Operator mission</button>
            <button onClick={() => navigate("/agents/growth_operator")} className="xa-btn-outline">Chat Growth Operator</button>
            <button onClick={() => navigate("/domains")} className="xa-btn-outline">Domain Registry</button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${category === c ? "border-transparent text-black" : "border-[#E5E7EB] text-black/50 hover:border-[#FFEA00] hover:text-black"}`}
              style={category === c ? { background: "linear-gradient(135deg,#FFF7B3,#FFEA00 20%,#E6D400 45%,#FFEE33 65%,#FFEA00 80%,#CCBB00)", boxShadow: "inset 0 1px #fff6, inset 0 -1px #8c6e0040, 0 1px 3px #00000026" } : {}}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => <AgentCard key={a.name} agent={a} onLaunch={(ag) => navigate(`/agents/${ag.name}`)} />)}
        </div>
      </section>
    </div>
  );
}