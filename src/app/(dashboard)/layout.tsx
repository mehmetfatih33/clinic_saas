import "@/app/globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QueryProvider } from "@/components/ui/QueryProvider";
import { Toaster } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Sidebar />
        <div className="sidebar-backdrop fixed inset-0 bg-black/40 z-40 md:hidden" />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-3 md:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </QueryProvider>
  );
}
