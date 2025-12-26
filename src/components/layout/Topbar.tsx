"use client";
import { Moon, Sun, LogOut, Menu } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/NotificationBell";

export function Topbar() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null);
  const { data: session } = useSession();
  const qc = useQueryClient();

  // Ensure hydration safety
  useEffect(() => {
    setMounted(true);
    // Check for existing dark mode preference
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('darkMode') === 'true';
    setDark(isDark);
  }, []);

  useEffect(() => {
    fetch('/api/my/clinics')
      .then(r => r.json())
      .then((d) => {
        setClinics(d.items || []);
        setActiveClinicId(d.activeClinicId || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem('darkMode', 'false');
    }
  }, [dark, mounted]);

  useEffect(() => {
    // Sync body class for mobile sidebar
    if (menuOpen) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
    const onBackdropClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && t.classList.contains('sidebar-backdrop')) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.body.classList.remove('mobile-sidebar-open');
      document.removeEventListener('click', onBackdropClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  // Role color mapping
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'text-red-600 dark:text-red-400';
      case 'ASISTAN': return 'text-blue-600 dark:text-blue-400';
      case 'UZMAN': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card p-3 px-4 md:px-6">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Clinic Selector */}
        {mounted && clinics.length > 0 && (
          <div className="hidden md:block min-w-48">
            <Select value={activeClinicId ?? undefined} onValueChange={async (val) => {
              setActiveClinicId(val);
              await fetch('/api/active-clinic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinicId: val }) });
              qc.invalidateQueries({ predicate: () => true });
            }}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Klinik Seç" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mounted && clinics.length > 0 && (
          <div className="md:hidden">
            <Select value={activeClinicId ?? undefined} onValueChange={async (val) => {
              setActiveClinicId(val);
              await fetch('/api/active-clinic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinicId: val }) });
              qc.invalidateQueries({ predicate: () => true });
            }}>
              <SelectTrigger className="w-32 text-xs h-8">
                <SelectValue placeholder="Klinik Seç" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Mobile menu toggle */}
        <button
          className="md:hidden rounded-md p-2 hover:bg-gray-100"
          aria-label="Menüyü aç/kapat"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 hidden md:block">Klinik Yönetim Paneli</h1>
        {mounted && activeClinicId && (
          <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hidden sm:inline-block">
            {clinics.find((c) => c.id === activeClinicId)?.name}
          </span>
        )}
        {session?.user && (
          <p className="text-xs text-gray-500 hidden lg:block">
            Hoşgeldiniz, <span className={getRoleColor(session.user.role)}>{session.user.name}</span>
            <span className="ml-1 text-gray-400">({session.user.role})</span>
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />
        
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="rounded-full p-2 hover:bg-gray-100"
          suppressHydrationWarning={true}
        >
          {mounted && (dark ? <Sun size={18} /> : <Moon size={18} />)}
          {!mounted && <Moon size={18} />}
        </button>
        
        {/* Logout Button - Mobile Friendly */}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1 text-gray-700 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Çıkış</span>
        </Button>
      </div>
    </header>
  );
}
