"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Users, Calendar, ClipboardList, FileText, BarChart3, Building2, CreditCard, Settings, DoorOpen, Wallet, Receipt, CheckSquare, TrendingUp, FilePlus, File, Clock } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [features, setFeatures] = useState<string[]>([]);
  const [planSlug, setPlanSlug] = useState<string>("");
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch('/api/plan');
        if (!res.ok) return;
        const data = await res.json();
        const arr = Array.isArray(data.features) ? data.features : [];
        setFeatures(arr);
        setPlanSlug(String(data.slug || ""));
      } catch {}
      finally { setFeaturesLoaded(true); }
    }
    loadPlan();
  }, []);

  // Define navigation items with role-based visibility
  const allNavItems = [
    { name: "Dashboard", href: "/admin", icon: BarChart3, roles: ["SUPER_ADMIN"] },
    { name: "Klinikler", href: "/admin/clinics", icon: Building2, roles: ["SUPER_ADMIN"] },
    { name: "Panel", href: "/dashboard", icon: BarChart3, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Hastalar", href: "/patients", icon: Users, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Randevular", href: "/appointments", icon: Calendar, roles: ["ADMIN", "ASISTAN", "UZMAN"] },
    { name: "Uzmanlar", href: "/specialists", icon: ClipboardList, roles: ["ADMIN", "ASISTAN"] },
    { name: "Atamalar", href: "/assignments", icon: FileText, roles: ["ADMIN"] },
    { name: "Görevler", href: "/tasks", icon: CheckSquare, roles: ["ADMIN", "ASISTAN", "UZMAN"], requiredFeature: "tasks" },
    { name: "Reçeteler", href: "/prescriptions", icon: File, roles: ["ADMIN", "UZMAN"], requiredFeature: "prescriptions" },
    { name: "Dokümanlar", href: "/documents", icon: File, roles: ["ADMIN", "ASISTAN", "UZMAN"], requiredFeature: "documents" },
    { name: "Hatırlatıcılar", href: "/reminders", icon: Calendar, roles: ["ADMIN", "ASISTAN"] },
    { name: "Raporlar", href: "/analytics", icon: BarChart3, roles: ["ADMIN", "UZMAN"], requiredFeature: "analytics" },
    { name: "Odalar", href: "/rooms", icon: DoorOpen, roles: ["ADMIN", "ASISTAN"], requiredFeature: "room-tracking" },
    { name: "Finans", href: "/finance", icon: CreditCard, roles: ["ADMIN", "ASISTAN", "UZMAN"], requiredFeature: "accounting" },
    { name: "Loglar", href: "/logs", icon: ClipboardList, roles: ["SUPER_ADMIN"] },
    { name: "Klinikler", href: "/clinics", icon: Building2, roles: ["ADMIN"] },
    { name: "Ayarlar", href: "/settings", icon: Settings, roles: ["ADMIN"] },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item: any) => {
    if (!item.roles.includes(userRole as string)) return false;
    if (item.requiredFeature) {
      if (!featuresLoaded) return true;
      if (planSlug === "full" || planSlug === "") return true;
      if (planSlug === "pro" && item.requiredFeature === "room-tracking") return true;
      return features.includes(item.requiredFeature);
    }
    return true;
  });

  return (
    <aside className="sidebar hidden md:flex flex-col justify-between h-full w-64 bg-white border-r p-4">
      {/* ÜST MENÜ */}
      <div>
        <div className="mb-6 px-2">
          <NextImage src="/logo.png" alt="Cliterapi" width={150} height={50} priority className="h-auto w-auto" />
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    document.body.classList.remove('mobile-sidebar-open');
                  }
                }}
              >
                <Icon className="w-5 h-5" />
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
