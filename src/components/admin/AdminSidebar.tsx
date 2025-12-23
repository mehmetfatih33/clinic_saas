"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTree, Building2, Users } from "lucide-react";
import clsx from "clsx";

export default function AdminSidebar() {
  const pathname = usePathname();
  const items = [
    { label: "Panel", href: "/admin", icon: LayoutDashboard },
    { label: "Planlar", href: "/admin/plans", icon: ListTree },
    { label: "Klinikler", href: "/admin/clinics", icon: Building2 },
    { label: "Kullanıcılar", href: "/admin/users", icon: Users },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-white p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary">Super Admin</h2>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                active ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

