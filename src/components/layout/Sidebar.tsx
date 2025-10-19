"use client";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Users, Calendar, ClipboardList, FileText, BarChart3, Building2, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Define navigation items with role-based visibility
  const allNavItems = [
    { name: "Panel", href: "/dashboard", icon: BarChart3, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Hastalar", href: "/patients", icon: Users, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Randevular", href: "/appointments", icon: Calendar, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Uzmanlar", href: "/specialists", icon: ClipboardList, roles: ["ADMIN", "ASISTAN"] },
    { name: "Atamalar", href: "/assignments", icon: FileText, roles: ["ADMIN"] },
    { name: "Ödemeler", href: "/payments", icon: CreditCard, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Klinikler", href: "/clinics", icon: Building2, roles: ["ADMIN"] },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    item.roles.includes(userRole as string)
  );

  return (
    <aside className="flex flex-col justify-between h-full bg-background border-r border-border p-4">
      {/* ÜST MENÜ */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-6">Klinik Paneli</h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ALT KISIM — ÇIKIŞ BUTONU */}
      <div className="mt-6">
        <Button
          variant="destructive"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  );
}