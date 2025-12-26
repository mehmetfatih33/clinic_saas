"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search, Calendar, Plus, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import AddReminderModal from "@/components/ui/AddReminderModal";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function RemindersPage() {
  return (
    <ToastProvider>
      <RemindersContent />
    </ToastProvider>
  );
}

function RemindersContent() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const res = await fetch("/api/reminders");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  const filteredReminders = reminders.filter((r: any) => 
    r.message?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hatırlatıcılar</h1>
          <p className="text-muted-foreground">Otomatik randevu hatırlatmaları ve bildirimler.</p>
        </div>
        <AddReminderModal onAdded={() => queryClient.invalidateQueries({ queryKey: ["reminders"] })} />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Hatırlatıcı veya hasta ara..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredReminders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReminders.map((reminder: any) => (
            <div key={reminder.id} className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${reminder.type === 'SMS' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {reminder.type === 'SMS' ? <MessageSquare size={16} /> : <Mail size={16} />}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{reminder.patient?.name || "Genel Hatırlatma"}</h3>
                    <span className="text-xs text-gray-500">{reminder.type}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${
                  reminder.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  reminder.status === 'SENT' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {reminder.status === 'PENDING' ? 'Bekliyor' : reminder.status === 'SENT' ? 'Gönderildi' : 'Hata'}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 bg-gray-50 p-2 rounded-lg">
                "{reminder.message}"
              </p>

              <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-3">
                <Calendar size={14} />
                <span>{format(new Date(reminder.scheduledFor), "dd MMM yyyy HH:mm", { locale: tr })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Henüz hatırlatıcı yok</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            Oluşturulan hatırlatıcılar burada listelenecektir.
          </p>
        </div>
      )}
    </div>
  );
}
