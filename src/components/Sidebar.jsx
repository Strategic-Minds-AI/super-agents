import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Sparkles, Factory, Layers, Globe, Server,
  Activity, Network, BarChart3, Bot, X
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { to: "/", label: "Command Center", icon: Home },
  { to: "/architect", label: "Meta Architect", icon: Sparkles },
  { to: "/factory", label: "System Factory", icon: Factory },
  { to: "/batch", label: "Batch Operations", icon: Layers },
  { to: "/website-factory", label: "Website Factory", icon: Globe },
  { to: "/provisioning", label: "Provisioning", icon: Server },
  { to: "/mission-control", label: "Mission Control", icon: Activity },
  { to: "/domains", label: "Domain Registry", icon: Network },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFEA00] to-[#CCBB00] flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-black" />
        </div>
        <div className="min-w-0">
          <div className="font-heading font-bold text-sm text-foreground leading-tight">Xtreme Super Agents</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Autonomous AI Swarm</div>
        </div>
        {onNavigate && (
          <button onClick={onNavigate} className="ml-auto md:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate("/agents/orchestrator")}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[#FFEA00] hover:bg-muted/50 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          New Agent Chat
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}