import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Plus, Brain, FolderKanban, Bot, Workflow, LibraryBig, Files, Trophy,
  ShieldCheck, CalendarClock, BookOpen, Plug, Activity, Settings, ChevronDown,
  Search, PanelLeftClose, CheckCircle2
} from "lucide-react";

const primary = [
  { to:"/agents/orchestrator", label:"APEX", Icon:Brain },
  { to:"/projects", label:"Projects", Icon:FolderKanban },
  { to:"/agents/orchestrator", label:"Agents", Icon:Bot },
  { to:"/work", label:"Workflows", Icon:Workflow },
  { to:"/architect", label:"Prompt Vault", Icon:LibraryBig },
  { to:"/files", label:"Files", Icon:Files },
  { to:"/mission-control", label:"Results", Icon:Trophy },
  { to:"/mission-control", label:"Approvals", Icon:ShieldCheck },
  { to:"/work", label:"Scheduled", Icon:CalendarClock },
  { to:"/search", label:"Library", Icon:BookOpen },
  { to:"/tools", label:"Plugins / Integrations", Icon:Plug },
  { to:"/mission-control", label:"System Health", Icon:Activity },
];

export default function Sidebar({ onNavigate }) {
  const navigate=useNavigate();
  const go=(to)=>{navigate(to);onNavigate?.();};
  return (
    <div className="h-full w-full bg-[#111214] text-[#eceff3] border-r border-[#25282d] flex flex-col">
      <div className="h-[62px] flex items-center px-4 border-b border-[#23262b]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d9e2ec] via-[#7b96b8] to-[#4a6fa5] text-[#0d1014] font-black flex items-center justify-center">A</div>
        <div className="ml-3 leading-tight">
          <div className="font-semibold text-[15px] tracking-wide">APEX</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#77808b]">Strategic Minds AI</div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[#858c96]"><Search size={17}/><PanelLeftClose size={17}/></div>
      </div>

      <div className="px-3 py-3">
        <button onClick={()=>go("/agents/orchestrator")} className="w-full h-10 rounded-lg bg-[#1b1d21] border border-[#2a2e34] hover:border-[#46566b] flex items-center px-3 gap-2.5 text-sm font-medium">
          <Plus size={17}/> New Chat
        </button>
      </div>

      <div className="px-2 pb-2 flex-1 overflow-y-auto xa-scroll">
        <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#646b74] px-3 py-2">Command</div>
        <nav className="space-y-0.5">
          {primary.map(({to,label,Icon})=>(
            <NavLink key={label} to={to} onClick={onNavigate}
              className={({isActive})=>`apex-nav ${isActive && label==="APEX" ? "active":""}`}>
              <Icon size={17} strokeWidth={1.8}/><span>{label}</span>
              {label==="Approvals" && <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#242933] text-[#aab9ca] text-[10px] flex items-center justify-center">3</span>}
              {label==="System Health" && <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={12}/>Online</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-[#23262b] p-2">
        <button onClick={()=>go("/settings")} className="apex-nav w-full"><Settings size={17}/><span>Settings</span></button>
        <div className="mt-1 flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#1a1c20]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7589a1] to-[#4a5f78] flex items-center justify-center text-xs font-semibold">JB</div>
          <div className="min-w-0"><div className="text-sm font-medium truncate">Jeremy</div><div className="text-[11px] text-[#757d87]">Strategic Minds AI</div></div>
          <ChevronDown size={15} className="ml-auto text-[#747b84]"/>
        </div>
      </div>
    </div>
  );
}
