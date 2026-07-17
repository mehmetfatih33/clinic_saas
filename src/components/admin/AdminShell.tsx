"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.10),_transparent_45%)]">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar for Desktop */}
        <div className="hidden md:block w-72 fixed inset-y-0 left-0 h-full p-4">
          <div className="h-full rounded-[28px] border border-slate-200 bg-white/80 backdrop-blur shadow-sm shadow-slate-200/70">
            <AdminSidebar />
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40">
          <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-xs font-semibold tracking-wide">
                SA
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Super Admin</div>
                <div className="text-[11px] text-slate-500">Control Center</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute top-0 left-0 bottom-0 w-72 p-4 animate-in slide-in-from-left duration-300">
              <div className="relative h-full rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="absolute right-2 top-2 z-10 flex justify-end p-2">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <AdminSidebar onClose={() => setSidebarOpen(false)} className="pt-10" />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-4 pt-24 md:p-10 md:pt-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
