import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#171717] text-[#ececec]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[300px] shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[300px] h-full shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] bg-[#171717]">
          <button onClick={() => setDrawerOpen(true)} className="text-[#7f7f7f] hover:text-[#ececec]">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading font-semibold text-sm text-[#ececec]">Xtreme Super Agents</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto xa-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}