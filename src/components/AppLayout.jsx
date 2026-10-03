import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D] text-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-[#1A1A1A]">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 h-full shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] bg-[#0D0D0D]">
          <button onClick={() => setDrawerOpen(true)} className="text-[#8A8F98] hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading font-bold text-sm text-white">Xtreme Super Agents</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}