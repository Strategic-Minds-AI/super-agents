import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Mic, ChevronDown, Globe2, Telescope, Image, FileText, Code2, MoreHorizontal, CalendarDays, Github, Mail, Users, Eye, Wrench, ShieldCheck, BarChart3, ExternalLink } from "lucide-react";

const agents = [
  {name:"Apex", desc:"Strategy & analysis", icon:Users, tone:"violet", path:"/agents/orchestrator"},
  {name:"Vision Cortex", desc:"Research & insight", icon:Eye, tone:"blue", path:"/architect"},
  {name:"Builder", desc:"Build & implement", icon:Wrench, tone:"orange", path:"/agents/code_architect"},
  {name:"Validator", desc:"QA & verification", icon:ShieldCheck, tone:"green", path:"/mission-control"},
  {name:"Growth Operator", desc:"Marketing & growth", icon:BarChart3, tone:"pink", path:"/agents/growth_operator"},
];
const chips=[
  {Icon:Globe2,label:"Search"},{Icon:Telescope,label:"Deep research"},{Icon:Image,label:"Create image"},
  {Icon:FileText,label:"Summarize"},{Icon:Code2,label:"Code"},{Icon:MoreHorizontal,label:"More"}
];

export default function AgentCommandCenter() {
  const navigate = useNavigate();
  const [mode,setMode]=useState("Chat");
  const [input,setInput]=useState("");
  const send=()=>{ if(input.trim()) navigate("/agents/orchestrator"); };
  return (
    <div className="h-full flex bg-[#111111]">
      <section className="flex-1 min-w-0 relative flex flex-col">
        <div className="h-[64px] flex justify-center items-center">
          <div className="gpt-mode-switch">{["Chat","Work"].map(m=><button key={m} onClick={()=>{setMode(m); if(m==="Work") navigate("/work")}} className={mode===m?"active":""}>{m}</button>)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-28">
          <h1 className="text-[31px] font-medium tracking-tight mb-10 text-center">What’s on your mind today?</h1>
          <div className="gpt-composer max-w-[860px] w-full">
            <button className="gpt-circle"><Plus size={22}/></button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask ChatGPT" />
            <button className="flex items-center gap-1 text-[#b9b9b9] text-[15px] px-2">Medium <ChevronDown size={15}/></button>
            <button className="gpt-circle border-0"><Mic size={20}/></button>
            <button onClick={send} className="w-11 h-11 rounded-full bg-[#2f70df] flex items-center justify-center text-white"><div className="flex gap-[2px] items-center">{[8,16,23,13,19].map((h,i)=><span key={i} className="w-[2px] rounded bg-white" style={{height:h}} />)}</div></button>
          </div>
          <div className="max-w-[860px] w-full flex flex-wrap gap-2 mt-4">{chips.map(({Icon,label})=><button key={label} className="gpt-tool-chip"><Icon size={18}/>{label}</button>)}</div>
          <div className="max-w-[770px] w-full mt-11 space-y-5 text-[15px]">
            <button onClick={()=>navigate("/mission-control")} className="gpt-suggestion"><CalendarDays size={23} className="text-blue-400"/>Oct 4–6 XPS social drafts make hard claims. Validate evidence before use.</button>
            <button onClick={()=>navigate("/provisioning")} className="gpt-suggestion"><Github size={23}/>BNM Railway builds failed after Docker fix. Diagnose both production services.</button>
            <button onClick={()=>navigate("/mission-control")} className="gpt-suggestion"><Mail size={23} className="text-red-400"/>OpenAI API continuity changed. Map which runtimes rely on direct credits.</button>
          </div>
        </div>
        <div className="absolute bottom-5 left-0 right-0 text-center text-[12px] text-[#9a9a9a]">ChatGPT can make mistakes. Workspace data isn’t used to train models.</div>
      </section>
      <aside className="hidden xl:block w-[308px] border-l border-[#242424] p-4"><div className="gpt-swarm-card">
        <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><span className="font-semibold text-[16px]">Swarm</span><span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-300">Beta</span></div><ChevronDown size={18}/></div>
        <div className="flex items-center gap-2 text-xs text-[#b0b0b0] mb-4"><span className="w-2 h-2 rounded-full bg-emerald-400"/>5 agents online</div>
        <div className="space-y-3">{agents.map(({name,desc,icon:Icon,tone,path})=><button key={name} onClick={()=>navigate(path)} className="w-full flex items-center gap-3 text-left rounded-lg p-2 hover:bg-[#202020]"><div className={"agent-dot "+tone}><Icon size={19}/></div><div className="min-w-0"><div className="text-sm font-medium">{name}</div><div className="text-xs text-[#929292]">{desc}</div><div className="text-[11px] text-emerald-400 mt-0.5">● Online</div></div><MoreHorizontal size={16} className="ml-auto text-[#9a9a9a]"/></button>)}</div>
        <button onClick={()=>navigate("/agents/orchestrator")} className="mt-5 w-full h-11 rounded-xl border border-[#393939] bg-[#202020] hover:bg-[#272727] flex items-center justify-center gap-2 text-sm font-medium"><ExternalLink size={15}/>Open Swarm</button>
      </div></aside>
    </div>
  );
}
