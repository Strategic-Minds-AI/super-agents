import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Layers3, Clock3, AtSign, MoreHorizontal, PenLine, Box, Folder, BarChart3, ChevronRight, Settings, Search, PanelLeft } from "lucide-react";

const pinned = [
  { to: "/agents/orchestrator", label: "Apex", icon: Box },
  { to: "/projects", label: "Strategic Minds AI Corporate Website", icon: Folder },
  { to: "/agents/code_architect", label: "@BUILD WEB APP", icon: Folder },
  { to: "/agents/growth_operator", label: "Digital Dominance", icon: BarChart3, accent: true },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const go = (path) => { navigate(path); onNavigate?.(); };

  return (
    <div className="flex h-full bg-[#0d0d0d] text-[#ececec]">
      <div className="w-[58px] border-r border-[#242424] flex flex-col items-center py-3 gap-3">
        <button onClick={() => go("/")} className="gpt-rail active" title="Home"><Home size={20}/></button>
        <button onClick={() => go("/projects")} className="gpt-rail" title="Projects"><Layers3 size={19}/></button>
        <button onClick={() => go("/search")} className="gpt-rail" title="History"><Clock3 size={19}/></button>
        <button onClick={() => go("/agents/orchestrator")} className="gpt-rail" title="Agents"><AtSign size={19}/></button>
        <button className="gpt-rail" title="More"><MoreHorizontal size={20}/></button>
        <div className="mt-auto w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[11px] font-semibold">SM</div>
      </div>

      <div className="w-[310px] min-w-[310px] border-r border-[#242424] flex flex-col bg-[#111111]">
        <div className="h-[62px] flex items-center px-4 gap-3">
          <div className="text-[20px] font-semibold tracking-tight">ChatGPT</div>
          <div className="ml-auto flex items-center gap-4 text-[#b4b4b4]">
            <Search size={18}/><PanelLeft size={18}/>
          </div>
        </div>

        <button onClick={() => go("/agents/orchestrator")} className="mx-3 mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1f1f1f] text-[15px]">
          <PenLine size={18}/> <span>New chat</span>
        </button>

        <div className="px-4 text-[13px] text-[#a1a1a1] mb-2">Pinned</div>
        <div className="px-2 space-y-1">
          {pinned.map(({to,label,icon:Icon,accent}) => (
            <NavLink key={label} to={to} onClick={onNavigate}
              className={({isActive}) => `gpt-side-item ${isActive ? "active":""}`}>
              <Icon size={18} className={accent ? "text-[#f7c948]" : ""}/>
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
          <div className="pl-10 space-y-1 text-[14px] text-[#c9c9c9]">
            <button onClick={() => go("/mission-control")} className="block py-1.5 hover:text-white">System audit status</button>
            <button onClick={() => go("/mission")} className="block py-1.5 hover:text-white">Autonomous System Audit</button>
            <button onClick={() => go("/provisioning")} className="block py-1.5 hover:text-white">Validate MCP Connection</button>
            <button onClick={() => go("/architect")} className="block py-1.5 hover:text-white truncate max-w-[245px]">Analyze Sources Generate Instructions</button>
          </div>
        </div>

        <div className="mt-5 px-3">
          <button onClick={() => go("/projects")} className="gpt-section-row">Projects <ChevronRight size={16}/></button>
          <button onClick={() => go("/search")} className="gpt-section-row">Recents <ChevronRight size={16}/></button>
        </div>

        <div className="mt-auto px-3 pb-3">
          <button onClick={() => go("/settings")} className="gpt-section-row"><span className="flex items-center gap-2"><Settings size={17}/>Settings</span></button>
          <div className="flex items-center gap-3 px-2 py-2.5 mt-1 rounded-lg hover:bg-[#1d1d1d]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-semibold">SM</div>
            <div className="min-w-0"><div className="text-sm font-medium">Strategic Minds</div><div className="text-xs text-[#878787]">Work</div></div>
            <ChevronRight size={15} className="ml-auto text-[#878787]"/>
          </div>
        </div>
      </div>
    </div>
  );
}
