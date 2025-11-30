"use client";
"use client";
import { Moon, Sun, LogOut, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  // Ensure hydration safety
  useEffect(() => {
    setMounted(true);
    // Check for existing dark mode preference
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('darkMode') === 'true';
    setDark(isDark);
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
    <header className="flex items-center justify-between border-b border-gray-200 bg-white p-3 px-6">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden rounded-md p-2 hover:bg-gray-100"
          aria-label="Menüyü aç/kapat"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Klinik Yönetim Paneli</h1>
        {session?.user && (
          <p className="text-xs text-gray-500">
            Hoşgeldiniz, <span className={getRoleColor(session.user.role)}>{session.user.name}</span>
            <span className="ml-1 text-gray-400">({session.user.role})</span>
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
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
