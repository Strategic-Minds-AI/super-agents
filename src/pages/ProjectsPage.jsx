import React from "react";
import { Folder, Box, BarChart3, Users, Database, Target, FileText, Plus, Search, MoreVertical } from "lucide-react";
const projects=[
  {name:"Apex",desc:"AI strategy, system design, and product development for Apex.",Icon:Box,chats:"24",files:"12"},
  {name:"Strategic Minds AI Corporate Website",desc:"Design, content, and development for the Strategic Minds AI website.",Icon:Folder,chats:"18",files:"8"},
  {name:"@BUILD WEB APP",desc:"Build and iterate on the internal web application.",Icon:Folder,chats:"37",files:"16"},
  {name:"Digital Dominance",desc:"Go-to-market strategy, content, and growth systems.",Icon:BarChart3,chats:"12",files:"6"},
  {name:"Client Intake Forms",desc:"Build and refine client intake systems, form logic, automations, and data workflows.",Icon:Users,chats:"9",files:"5"},
  {name:"System Audit",desc:"Ongoing audits, security reviews, and system optimization.",Icon:Database,chats:"14",files:"10"},
  {name:"Marketing Strategy",desc:"Positioning, content strategy, and multi-channel campaigns.",Icon:Target,chats:"11",files:"7"},
  {name:"Research & Insights",desc:"Market research, competitive analysis, and strategic insights.",Icon:FileText,chats:"6",files:"4"},
];
export default function ProjectsPage(){
 return <div className="h-full overflow-y-auto p-8 bg-[#111]"><div className="max-w-[1180px] mx-auto">
   <div className="flex items-start justify-between"><div><h1 className="text-3xl font-semibold">Projects</h1><p className="text-[#aaa] mt-1">Keep your work organized. Use projects to group chats, files, and custom instructions.</p></div><button className="px-5 py-2.5 rounded-full bg-white text-black font-medium flex items-center gap-2"><Plus size={18}/>New project</button></div>
   <div className="mt-8 flex gap-4"><div className="flex-1 h-12 rounded-full border border-[#343434] bg-[#1a1a1a] flex items-center px-4 gap-3"><Search size={18} className="text-[#999]"/><input className="flex-1 bg-transparent outline-none" placeholder="Search projects..."/></div></div>
   <div className="grid md:grid-cols-2 gap-4 mt-6">{projects.map(({name,desc,Icon,chats,files})=><div key={name} className="rounded-2xl border border-[#343434] bg-[#1a1a1a] p-5 min-h-[170px]"><div className="flex"><div className="w-12 h-12 rounded-xl bg-[#292929] flex items-center justify-center"><Icon size={24}/></div><div className="ml-4"><div className="font-semibold text-lg">{name}</div><div className="text-sm text-[#aaa] mt-1 max-w-[430px]">{desc}</div></div><MoreVertical size={18} className="ml-auto text-[#999]"/></div><div className="mt-5 text-sm text-[#aaa]">◌ {chats} &nbsp;&nbsp; ▤ {files} &nbsp; · &nbsp; 3 agents</div></div>)}</div>
  </div></div>
}
