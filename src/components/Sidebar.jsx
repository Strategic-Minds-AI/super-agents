import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Sparkles, Factory, Activity, BarChart3, Settings,
  Plus, Pin, Clock, X, MessageSquare, Bot, Zap, Globe
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const RAIL = [
  { to: "/", label: "Home", icon: Home },
  { to: "/architect", label: "Architect", icon: Sparkles },
  { to: "/factory", label: "Factory", icon: Factory },
  { to: "/mission-control", label: "Mission", icon: Activity },
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

const RECENTS = [
  { to: "/domains", label: "Domain Registry" },
  { to: "/batch", label: "Batch Operations" },
  { to: "/website-factory", label: "Website Factory" },
  { to: "/provisioning", label: "Infrastructure" },
  { to: "/mission", label: "Growth Mission" },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="flex flex-col items-center gap-1 w-[52px] shrink-0 border-r border-[#1A1A1A] bg-[#0A0A0A] py-3">
        {RAIL.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) => `xa-rail-item ${isActive ? "active" : ""}`}
            title={label}
          >
            <Icon className="w-[18px] h-[18px]" />
          </NavLink>
        ))}
        <div className="mt-auto">
          <NavLink to="/provisioning" onClick={onNavigate} className="xa-rail-item" title="Settings">
            <Settings className="w-[18px] h-[18px]" />
          </NavLink>
        </div>
      </div>

      {/* Panel */}
      <div className="flex flex-col flex-1 bg-[#0D0D0D] text-white min-w-0 relative">
        {/* New chat */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => { navigate("/agents/orchestrator"); onNavigate?.(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-[#2F2F2F] bg-[#171717] text-sm font-medium text-white hover:border-[#3A3F4A] hover:bg-[#1E1E1E] transition-all"
          >
            <Plus className="w-4 h-4 text-[#B8C5D6]" />
            <span>New chat</span>
          </button>
        </div>

        {/* Pinned */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-[#8A8F98] uppercase tracking-wider">
            <Pin className="w-3 h-3" /> Pinned
          </div>
          <div className="space-y-0.5">
            {PINNED.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `xa-nav-item ${isActive ? "active" : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0 text-[#8A8F98]" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Recents */}
        <div className="px-3 pt-4 flex-1 overflow-y-auto xa-scroll">
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-[#8A8F98] uppercase tracking-wider">
            <Clock className="w-3 h-3" /> Recents
          </div>
          <div className="space-y-0.5">
            {RECENTS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `xa-nav-item ${isActive ? "active" : ""}`}
              >
                <Globe className="w-4 h-4 shrink-0 text-[#8A8F98]" />
                <span className="truncate text-sm">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#1A1A1A]">
          <ThemeToggle />
        </div>

        {onNavigate && (
          <button onClick={onNavigate} className="absolute top-3 right-3 text-[#8A8F98] hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}