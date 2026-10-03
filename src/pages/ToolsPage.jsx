import React from "react";
import { Globe2, FileText, Terminal, Github, Triangle, Database, TrainFront, Globe, Container, Network, Wrench, Plus, Search } from "lucide-react";
const tools=[
{name:"Web Search",desc:"Search the web for up-to-date information.",Icon:Globe2,on:true},
{name:"Files",desc:"Upload and analyze files and documents.",Icon:FileText,on:true},
{name:"Code Interpreter",desc:"Run code and analyze data.",Icon:Terminal,on:true},
{name:"GitHub",desc:"Browse repositories and manage code.",Icon:Github,on:true},
{name:"Vercel",desc:"Deploy and inspect projects.",Icon:Triangle,on:true},
{name:"Supabase",desc:"Query data and manage storage.",Icon:Database,on:true},
{name:"Railway",desc:"Manage worker infrastructure.",Icon:TrainFront,on:true},
{name:"GoDaddy",desc:"Manage domains and DNS.",Icon:Globe,on:false},
{name:"Docker (Local)",desc:"Inspect local containers and workers.",Icon:Container,on:true},
{name:"MCP (Local)",desc:"Connect to custom MCP servers.",Icon:Network,on:true},
{name:"Custom Tool",desc:"Add a custom API or webhook.",Icon:Wrench,on:false}
];
export default function ToolsPage(){return <div className="h-full overflow-y-auto p-8 bg-[#111]"><div className="max-w-[1200px] mx-auto">
<div className="flex justify-between"><div><h1 className="text-3xl font-semibold">Tools</h1><p className="text-[#aaa] mt-1">Connect your tools and services to extend what ChatGPT can do.</p></div><button className="gpt-action"><Plus size={18}/>Add tools</button></div>
<div className="mt-6 h-12 rounded-xl border border-[#343434] bg-[#1a1a1a] flex items-center px-4 gap-3"><Search size={18} className="text-[#999]"/><input className="bg-transparent outline-none flex-1" placeholder="Search tools and plugins..."/></div>
<h2 className="mt-7 font-semibold text-lg">Connected services</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">{tools.map(({name,desc,Icon,on})=><div key={name} className="rounded-xl border border-[#343434] bg-[#1a1a1a] p-4 flex gap-3 items-center"><div className="w-11 h-11 rounded-xl bg-[#242424] flex items-center justify-center"><Icon size={22}/></div><div className="min-w-0"><div className="font-medium">{name}</div><div className="text-xs text-[#aaa] mt-1">{desc}</div></div><div className={"ml-auto w-10 h-6 rounded-full p-1 "+(on?"bg-blue-500":"bg-[#555]")}><div className={"w-4 h-4 bg-white rounded-full transition-transform "+(on?"translate-x-4":"")}/></div></div>)}</div>
</div></div>}
