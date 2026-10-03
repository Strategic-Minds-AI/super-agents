import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Sparkles, Factory, Activity, BarChart3, Settings,
  Plus, Pin, Clock, X, MessageSquare, Bot, Zap, Globe,
  Search, Compass
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const RAIL = [
  { to: "/", label: "Home", icon: Home },
  { to: "/architect", label: "Explore", icon: Compass },
  { to: "/mission-control", label: "Activity", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const PINNED = [
  { to: "/agents/orchestrator", label: "Apex Orchestrator", icon: Sparkles },
  { to: "/agents/growth_operator", label: "Growth Operator", icon: Activity },
  { to: "/agents/code_architect", label: "Code Architect", icon: Factory },
  { to: "/agents/social_strategist", label: "Social Strategist", icon: MessageSquare },
  { to: "/agents/sales_engine", label: "Sales Engine", icon: Zap },
  { to: "/agents/brand_guardian", label: "Brand Guardian", icon: Bot },
];

const PROJECTS = [
  { to: "/factory", label: "System Factory" },
  { to: "/website-factory", label: "Website Factory" },
  { to: "/batch", label: "Batch Operations" },
];

const RECENTS = [
  { to: "/domains", label: "Domain Registry" },
  { to: "/provisioning", label: "Infrastructure" },
  { to: "/mission", label: "Growth Mission" },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full">
      {/* ═══ Icon Rail — narrow far-left bar ═══ */}
      <div className="flex flex-col items-center gap-1 w-[48px] shrink-0 bg-[#0d0d0d] py-3 border-r border-[#1a1a1a]">
        {RAIL.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) => `xa-rail-item ${isActive ? "active" : ""}`}
            title={label}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </NavLink>
        ))}
        <div className="mt-auto">
          <NavLink to="/provisioning" onClick={onNavigate} className="xa-rail-item" title="Settings">
            <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </NavLink>
        </div>
      </div>

      {/* ═══ Panel — wider sidebar with sections ═══ */}
      <div className="flex flex-col flex-1 bg-[#171717] text-[#ececec] min-w-0 relative">
        {/* New chat */}
        <div className="px-3 pt-4 pb-3">
          <button
            onClick={() => { navigate("/agents/orchestrator"); onNavigate?.(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-[#2a2a2a] bg-[#212121] text-sm font-medium text-[#ececec] hover:bg-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>New chat</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-sm text-[#7f7f7f]">
            <Search className="w-4 h-4" strokeWidth={1.75} />
            <span>Search chats</span>
          </div>
        </div>

        {/* Pinned */}
        <div className="px-3 pt-1">
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-[#7f7f7f] uppercase tracking-wider">
            <Pin className="w-3 h-3" strokeWidth={2} /> Pinned
          </div>
          <div className="space-y-0.5">
            {PINNED.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `xa-nav-item ${isActive ? "active" : ""}`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0 text-[#7f7f7f]" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="px-3 pt-4">
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-[#7f7f7f] uppercase tracking-wider">
            <Factory className="w-3 h-3" strokeWidth={2} /> Projects
          </div>
          <div className="space-y-0.5">
            {PROJECTS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `xa-nav-item ${isActive ? "active" : ""}`}
              >
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Recents */}
        <div className="px-3 pt-4 flex-1 overflow-y-auto xa-scroll min-h-0">
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-[#7f7f7f] uppercase tracking-wider">
            <Clock className="w-3 h-3" strokeWidth={2} /> Recents
          </div>
          <div className="space-y-0.5">
            {RECENTS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `xa-nav-item ${isActive ? "active" : ""}`}
              >
                <Globe className="w-[18px] h-[18px] shrink-0 text-[#7f7f7f]" strokeWidth={1.75} />
                <span className="truncate text-sm">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#1a1a1a]">
          <ThemeToggle />
        </div>

        {onNavigate && (
          <button onClick={onNavigate} className="absolute top-3 right-3 text-[#7f7f7f] hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}