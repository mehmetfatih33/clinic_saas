"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block w-64 border-r bg-white fixed inset-y-0 left-0 h-full">
        <AdminSidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4 shadow-sm">
        <h1 className="font-semibold text-lg text-primary">Super Admin</h1>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
           <div className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl animate-in slide-in-from-left duration-300">
             <div className="flex justify-end p-2 absolute right-2 top-2 z-10">
               <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                 <X className="w-5 h-5" />
               </Button>
             </div>
             <AdminSidebar onClose={() => setSidebarOpen(false)} className="pt-10" />
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 pt-20 md:p-6 md:pt-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
