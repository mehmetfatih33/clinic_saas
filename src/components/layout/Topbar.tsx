"use client";
"use client";
import { Moon, Sun, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
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
    <header className="flex items-center justify-between border-b border-gray-200 bg-white/70 p-3 px-6 backdrop-blur dark:bg-gray-900/60 dark:border-gray-800">
      <div>
        <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Klinik Yönetim Paneli</h1>
        {session?.user && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hoşgeldiniz, <span className={getRoleColor(session.user.role)}>{session.user.name}</span>
            <span className="ml-1 text-gray-400">({session.user.role})</span>
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="rounded-full p-2 hover:bg-sky-100 dark:hover:bg-gray-800"
          suppressHydrationWarning={true}
        >
          {mounted && (dark ? <Sun size={18} /> : <Moon size={18} />)}
          {!mounted && <Moon size={18} />}
        </button>
        
        {/* Logout Button - Mobile Friendly */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/10"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Çıkış</span>
        </Button>
      </div>
    </header>
  );
}