import React from "react";
import { Folder, Box, BarChart3, Users, Database, Target, FileText, Plus, Search, MoreVertical } from "lucide-react";
const projects=[
  ["Apex","AI strategy, system design, and product development for Apex.",Box,"24","12"],
  ["Strategic Minds AI Corporate Website","Design, content, and development for the Strategic Minds AI website.",Folder,"18","8"],
  ["@BUILD WEB APP","Build and iterate on the internal web application.",Folder,"37","16"],
  ["Digital Dominance","Go-to-market strategy, content, and growth systems.",BarChart3,"12","6"],
  ["Client Intake Forms","Build and refine client intake systems, form logic, automations, and data workflows.",Users,"9","5"],
  ["System Audit","Ongoing audits, security reviews, and system optimization.",Database,"14","10"],
  ["Marketing Strategy","Positioning, content strategy, and multi-channel campaigns.",Target,"11","7"],
  ["Research & Insights","Market research, competitive analysis, and strategic insights.",FileText,"6","4"],
];
export default function ProjectsPage(){
 return <div className="h-full overflow-y-auto p-8 bg-[#111]">
  <div className="max-w-[1180px] mx-auto">
   <div className="flex items-start justify-between"><div><h1 className="text-3xl font-semibold">Projects</h1><p className="text-[#aaa] mt-1">Keep your work organized. Use projects to group chats, files, and custom instructions.</p></div><button className="px-5 py-2.5 rounded-full bg-white text-black font-medium flex items-center gap-2"><Plus size={18}/>New project</button></div>
   <div className="mt-8 flex gap-4"><div className="flex-1 h-12 rounded-full border border-[#343434] bg-[#1a1a1a] flex items-center px-4 gap-3"><Search size={18} className="text-[#999]"/><input className="flex-1 bg-transparent outline-none" placeholder="Search projects..."/></div></div>
   <div className="grid md:grid-cols-2 gap-4 mt-6">{projects.map(([name,desc,Icon,chats,files])=><div key={name} className="rounded-2xl border border-[#343434] bg-[#1a1a1a] p-5 min-h-[170px]"><div className="flex"><div className="w-12 h-12 rounded-xl bg-[#292929] flex items-center justify-center"><Icon size={24}/></div><div className="ml-4"><div className="font-semibold text-lg">{name}</div><div className="text-sm text-[#aaa] mt-1 max-w-[430px]">{desc}</div></div><MoreVertical size={18} className="ml-auto text-[#999]"/></div><div className="mt-5 text-sm text-[#aaa]">◌ {chats} &nbsp;&nbsp; ▤ {files} &nbsp; · &nbsp; 3 agents</div></div>)}</div>
  </div>
 </div>
}
