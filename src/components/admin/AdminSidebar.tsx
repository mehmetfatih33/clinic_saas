"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, LayoutDashboard, ListTree, LogOut, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

interface AdminSidebarProps {
  className?: string;
  onClose?: () => void;
}

export default function AdminSidebar({ className, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const items = [
    { label: "Panel", href: "/admin", icon: LayoutDashboard },
    { label: "Planlar", href: "/admin/plans", icon: ListTree },
    { label: "Klinikler", href: "/admin/clinics", icon: Building2 },
    { label: "Kullanıcılar", href: "/admin/users", icon: Users },
    { label: "Loglar", href: "/logs", icon: ClipboardList },
  ];

  return (
    <aside className={clsx("flex h-full flex-col justify-between p-5", className)}>
      <div>
        <div className="mb-6">
          <div className="rounded-[22px] bg-slate-950 px-4 py-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-xs font-semibold tracking-wide">
                SA
              </div>
              <div>
                <div className="text-sm font-semibold">Super Admin</div>
                <div className="text-[11px] text-slate-300">Control Center</div>
              </div>
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors",
                    active
                      ? "border-white/10 bg-white/10 text-white"
                      : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        <Button
          variant="destructive"
          className="w-full flex items-center justify-center gap-2 rounded-2xl"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  );
}
