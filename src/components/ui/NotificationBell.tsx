"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Bildirimler alınamadı");
      return res.json() as Promise<{ items: Notification[], unreadCount: number }>;
    },
    refetchInterval: 30000, // Check every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      router.push(n.link);
    }
  };

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      toast.info(`Okunmamış ${unreadCount} yeni bildiriminiz var`, {
        description: "Bildirimlerinizi kontrol etmeyi unutmayın.",
      });
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Bildirimler</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-blue-500">{unreadCount} okunmamış</span>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Bildiriminiz yok</div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !n.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${!n.isRead ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-2 text-[10px] text-gray-400">
                          {format(new Date(n.createdAt), "d MMM HH:mm", { locale: tr })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
