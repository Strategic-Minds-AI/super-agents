import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111] text-[#ececec]">
      <aside className="hidden lg:flex w-[368px] shrink-0"><Sidebar /></aside>
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[368px] h-full"><Sidebar onNavigate={() => setDrawerOpen(false)} /></aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 bg-[#111111]">
        <header className="lg:hidden h-14 flex items-center px-4 border-b border-[#242424]">
          <button onClick={() => setDrawerOpen(true)}><Menu size={20}/></button>
          <span className="ml-3 font-semibold">ChatGPT</span>
        </header>
        <main className="flex-1 min-h-0 overflow-hidden"><Outlet /></main>
      </div>
    </div>
  );
}
