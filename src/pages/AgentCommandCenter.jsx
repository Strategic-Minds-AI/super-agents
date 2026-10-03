import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp, Plus, Mic, Paperclip, Globe2, ChevronDown, MoreHorizontal,
  Boxes, Search, ServerCog, Sparkles, Brain, Activity, GitBranch, Database,
  Container, ShieldCheck, Clock3
} from "lucide-react";
import { runtime } from "@/lib/runtimeClient";

const projects=[
  {name:"AI HUB",desc:"Unified orchestration, MCP routes, workers and runtime control.",Icon:Boxes,path:"/mission-control",status:"Active",meta:"12 agents · 4 runtimes"},
  {name:"DIGITAL DOMINANCE",desc:"SEO, AEO, GEO and automated growth operations.",Icon:Search,path:"/agents/growth_operator",status:"Active",meta:"Growth Operator"},
  {name:"JARVIS",desc:"Persistent local Docker worker fabric and execution node.",Icon:ServerCog,path:"/work",status:"Online",meta:"10 workers"},
  {name:"WEBSITE FACTORY",desc:"Universal build, visual validation and replication pipeline.",Icon:Sparkles,path:"/website-factory",status:"Ready",meta:"Factory runtime"},
];

const quick=[
  {label:"Build an app",Icon:GitBranch,path:"/agents/code_architect"},
  {label:"Research",Icon:Globe2,path:"/architect"},
  {label:"Run swarm",Icon:Brain,path:"/agents/swarm"},
  {label:"Validate system",Icon:ShieldCheck,path:"/mission-control"},
];

export default function AgentCommandCenter(){
  const navigate=useNavigate();
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);

  const send=async()=>{
    const message=input.trim();
    if(!message||busy) return;
    setBusy(true);
    try{
      const conv=await runtime.createConversation({agent_name:"orchestrator",metadata:{source:"apex_portal"}});
      await runtime.sendMessage(conv.id,{role:"user",content:message});
      navigate("/agents/orchestrator");
    }catch{
      navigate("/agents/orchestrator");
    }finally{
      setBusy(false);setInput("");
    }
  };

  return (
    <div className="h-full bg-[#0f1012] text-[#eef1f5] flex flex-col overflow-hidden">
      <header className="h-[62px] px-6 flex items-center border-b border-[#22252a] shrink-0">
        <div>
          <div className="text-sm font-semibold tracking-wide">APEX</div>
          <div className="text-[11px] text-[#717985]">Command workspace</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 h-8 px-3 rounded-full border border-[#2a2e34] bg-[#15171a] text-[11px] text-[#a4adb8]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Persistent runtime online
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-[#1a1d21] flex items-center justify-center text-[#87909b]"><MoreHorizontal size={18}/></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto xa-scroll">
        <div className="max-w-[1060px] mx-auto px-6 pt-[72px] pb-36">
          <section className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e5ebf2] via-[#90a5bd] to-[#526f91] text-[#11151a] flex items-center justify-center shadow-[0_10px_35px_rgba(74,111,165,.18)]"><Brain size={24}/></div>
            <h1 className="mt-5 text-[34px] md:text-[40px] font-semibold tracking-[-0.035em]">How can I help you today?</h1>
            <p className="mt-3 text-[14px] text-[#858e99]">APEX can plan, build, research, coordinate the swarm, validate, and continue work through your persistent runtime.</p>
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#cfd5dc]">Active Projects</h2>
              <button onClick={()=>navigate("/projects")} className="text-xs text-[#7f91a7] hover:text-[#b8c7d8]">View all</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {projects.map(({name,desc,Icon,path,status,meta})=>(
                <button key={name} onClick={()=>navigate(path)} className="apex-project-card text-left">
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-xl bg-[#1b1e23] border border-[#2b3037] flex items-center justify-center text-[#aebed0]"><Icon size={19}/></div>
                    <div className="ml-3 min-w-0">
                      <div className="font-semibold text-[14px] tracking-wide">{name}</div>
                      <div className="mt-1 text-[12px] leading-5 text-[#7f8791]">{desc}</div>
                    </div>
                    <MoreHorizontal size={17} className="ml-auto text-[#5f6770]"/>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#15181c] border border-[#292d33] text-[#9da7b2]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{status}</span>
                    <span className="text-[#656d77]">{meta}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-[#cfd5dc]">Start with APEX</h2><span className="text-[11px] text-[#646c76]">Super Agent Zero</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {quick.map(({label,Icon,path})=><button key={label} onClick={()=>navigate(path)} className="h-[76px] rounded-xl border border-[#272b31] bg-[#141619] hover:bg-[#191c20] hover:border-[#3b4653] transition-all flex flex-col items-start justify-between p-3 text-left"><Icon size={17} className="text-[#95a8bd]"/><span className="text-[12px] font-medium">{label}</span></button>)}
            </div>
          </section>

          <section className="mt-7 grid md:grid-cols-3 gap-2.5">
            <div className="apex-status-card"><Activity size={15}/><div><div className="text-[11px] text-[#717985]">Runtime</div><div className="text-[12px] font-medium">Agent Factory online</div></div></div>
            <div className="apex-status-card"><Database size={15}/><div><div className="text-[11px] text-[#717985]">State</div><div className="text-[12px] font-medium">Durable queue active</div></div></div>
            <div className="apex-status-card"><Container size={15}/><div><div className="text-[11px] text-[#717985]">Workers</div><div className="text-[12px] font-medium">Docker + Railway</div></div></div>
          </section>
        </div>
      </div>

      <div className="absolute lg:left-[286px] left-0 right-0 bottom-0 pointer-events-none">
        <div className="max-w-[820px] mx-auto px-5 pb-5 pointer-events-auto">
          <div className="apex-composer">
            <button className="apex-compose-icon"><Plus size={19}/></button>
            <button className="apex-compose-icon hidden sm:flex"><Paperclip size={17}/></button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="+ Ask APEX anything…" />
            <button className="hidden md:flex items-center gap-1.5 px-2 text-[11px] text-[#7c8590]">GPT-5.6 <ChevronDown size={12}/></button>
            <button className="apex-compose-icon"><Mic size={18}/></button>
            <button onClick={send} disabled={!input.trim()||busy} className="apex-send"><ArrowUp size={17}/></button>
          </div>
          <div className="mt-2 flex justify-center items-center gap-3 text-[10px] text-[#59616b]"><span className="flex items-center gap-1"><Clock3 size={11}/>Persistent</span><span>•</span><span>Governed execution</span><span>•</span><span>Independent validation</span></div>
        </div>
      </div>
    </div>
  );
}
