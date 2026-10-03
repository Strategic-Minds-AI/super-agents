import React,{useState} from "react";
import {Outlet} from "react-router-dom";
import {Menu} from "lucide-react";
import Sidebar from "@/components/Sidebar";
export default function AppLayout(){
 const [open,setOpen]=useState(false);
 return <div className="flex h-screen overflow-hidden bg-[#0f1012] text-[#eef1f5]">
  <aside className="hidden lg:flex w-[286px] shrink-0"><Sidebar/></aside>
  {open&&<div className="lg:hidden fixed inset-0 z-50 flex"><div className="absolute inset-0 bg-black/70" onClick={()=>setOpen(false)}/><aside className="relative w-[286px] h-full"><Sidebar onNavigate={()=>setOpen(false)}/></aside></div>}
  <div className="flex-1 min-w-0 flex flex-col relative">
   <header className="lg:hidden h-14 shrink-0 border-b border-[#23262b] flex items-center px-4 bg-[#111214]"><button onClick={()=>setOpen(true)}><Menu size={20}/></button><span className="ml-3 font-semibold">APEX</span></header>
   <main className="flex-1 min-h-0 overflow-hidden relative"><Outlet/></main>
  </div>
 </div>
}
