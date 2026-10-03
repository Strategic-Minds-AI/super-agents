import React from "react";
import { Settings, User, Folder, Puzzle, Link2, Database, Bell, Users, Box, Eye, Code2, ShieldCheck, BarChart3 } from "lucide-react";
const agents=[
{name:"Apex",desc:"Strategic orchestrator. Plans, coordinates and executes tasks.",Icon:Box},
{name:"Vision Cortex",desc:"Researches, analyzes and generates insights from data and the web.",Icon:Eye},
{name:"Builder",desc:"Creates, iterates and deploys code, apps and automations.",Icon:Code2},
{name:"Validator",desc:"Validates outputs, checks accuracy, security and compliance.",Icon:ShieldCheck},
{name:"Growth Operator",desc:"Drives distribution, SEO, content and growth initiatives.",Icon:BarChart3}
];
const sections=[
{Icon:Settings,label:"General"},{Icon:User,label:"Personalization"},{Icon:Folder,label:"Projects"},
{Icon:Puzzle,label:"Plugins"},{Icon:Link2,label:"Connected Apps"},{Icon:Database,label:"Memory"},
{Icon:Bell,label:"Notifications"},{Icon:Users,label:"Swarm"}
];
export default function SettingsPage(){return <div className="h-full overflow-y-auto bg-[#111] p-8"><div className="max-w-[1060px] mx-auto rounded-2xl border border-[#3b3b3b] bg-[#191919] overflow-hidden"><div className="px-6 h-16 flex items-center border-b border-[#333]"><h1 className="text-2xl font-semibold">Settings</h1></div><div className="grid md:grid-cols-[260px_1fr] min-h-[680px]"><aside className="border-r border-[#333] p-4">{sections.map(({Icon,label})=><button key={label} className={"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left "+(label==="Swarm"?"bg-[#303030]":"hover:bg-[#242424]")}><Icon size={20}/>{label}</button>)}</aside><section className="p-7"><h2 className="text-2xl font-semibold">Swarm</h2><p className="text-[#aaa] mt-1">Enable and configure your Strategic Minds AI agent swarm.</p><div className="mt-5 divide-y divide-[#333]">{agents.map(({name,desc,Icon})=><div key={name} className="py-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-[#111] flex items-center justify-center"><Icon size={23}/></div><div><div className="font-medium text-lg">{name}</div><div className="text-sm text-[#aaa]">{desc}</div></div><div className="ml-auto w-11 h-6 bg-blue-500 rounded-full p-1"><div className="w-4 h-4 rounded-full bg-white translate-x-5"/></div></div>)}</div></section></div></div></div>}
