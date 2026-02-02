"use client";
"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Users, DollarSign, Calendar, UserCheck, Activity, Building2, Edit2, X, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import moment from "moment";

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState({ patients: 0, payments: 0, income: 0 });
  const { data: session } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const isUzman = session?.user?.role === "UZMAN";
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN";

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      router.replace("/admin");
    }
  }, [session, router]);

  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  
  // Note editing state
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [noteContent, setNoteContent] = useState("");
  const queryClient = useQueryClient();

  // Note update mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Not güncellenemedi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-appointments"] });
      setEditingAppointment(null);
      show("Not başarıyla güncellendi", "success");
    },
    onError: () => {
      show("Not güncellenirken bir hata oluştu", "error");
    }
  });

  const handleEditNote = (appointment: any) => {
    setEditingAppointment(appointment);
    setNoteContent(appointment.notes || "");
  };

  const handleSaveNote = () => {
    if (editingAppointment) {
      updateNoteMutation.mutate({ id: editingAppointment.id, notes: noteContent });
    }
  };

  // Fetch appointments for recent activity (role-based)
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ["recent-appointments", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items.slice(0, 3);
    },
    enabled: !!session?.user
  });

  // Fetch activity feed data (role-based)
  const { data: activityFeed = [] } = useQuery({
    queryKey: ["activity-feed", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items.slice(0, 5);
    },
    enabled: !!session?.user
  });

  // Fetch payments for activity feed (role-based)
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["recent-payments", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items.slice(0, 3);
    },
    enabled: !!session?.user
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["appointments-all"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : (Array.isArray(json?.experts) ? json.experts : []));
      return items;
    },
    enabled: isAdmin
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ["patients-all"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
    enabled: isAdmin
  });

  

  const { data: roomsAll = [] } = useQuery({
    queryKey: ["rooms-all"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
    enabled: isAdmin
  });

  const { data: roomsAvailable = [] } = useQuery({
    queryKey: ["rooms-available"],
    queryFn: async () => {
      const date = new Date().toISOString();
      const res = await fetch(`/api/rooms?date=${encodeURIComponent(date)}&duration=60`);
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
    enabled: isAdmin
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-dashboard", session?.user?.role],
    queryFn: async () => {
      let url = "/api/transactions";
      if (isUzman && session?.user?.id) {
        url += `?specialistId=${session.user.id}`;
      }
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
    enabled: !!session?.user && (isAdmin || isUzman),
  });

  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : (Array.isArray(json?.experts) ? json.experts : []));
      return items;
    },
    enabled: isAdmin,
  });

  const totalIncome = transactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
  const totalExpense = transactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
  const netTotal = totalIncome - totalExpense;
  const donutData = [
    { name: "Gelir", value: totalIncome, color: "#6366f1" },
    { name: "Gider", value: totalExpense, color: "#f59e0b" },
  ];

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Stats fetch error:", error);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    let timer: any;
    const roles = ["ADMIN", "ASISTAN", "UZMAN"];
    if (session?.user?.role && roles.includes(session.user.role)) {
      const tick = async () => {
        const now = new Date();
        const to = new Date(now.getTime() + 60 * 60000);
        const sp = new URLSearchParams({ from: now.toISOString(), to: to.toISOString() });
        const res = await fetch(`/api/appointments?${sp.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const upcoming = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
        upcoming.forEach((a: any) => {
          if (!notifiedIds.has(a.id)) {
            const t = new Date(a.date).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            const msg = `⏰ 1 saat sonra randevu: ${a.patient?.name || "Hasta"} • ${a.specialist?.name || "Uzman"} • ${t}`;
            show(msg, "info");
            setNotifiedIds(prev => new Set(prev).add(a.id));
          }
        });
      };
      tick();
      timer = setInterval(tick, 60000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [session, notifiedIds, show]);

  const cards = [
    { 
      icon: Users, 
      label: isUzman ? "Hastalarım" : "Tüm Hastalar", 
      value: `${stats.patients} Hasta`,
      color: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      onClick: () => router.push("/patients")
    },
    { 
      icon: Calendar, 
      label: isUzman ? "Randevularım" : "Tüm Randevular", 
      value: `${recentAppointments.length} Randevu`,
      color: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      onClick: () => router.push("/appointments")
    },
    { 
      icon: DollarSign, 
      label: isUzman ? "Kazancım" : "Toplam Gelir", 
      value: `₺${stats.income}`,
      color: "bg-yellow-50 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      onClick: () => router.push("/payments")
    },
  ];  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'CANCELED':
        return 'text-red-600 bg-red-100';
      case 'SCHEDULED':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Tamamlandı';
      case 'CANCELED':
        return 'İptal Edildi';
      case 'SCHEDULED':
        return 'Randevu Onaylandı';
      default:
        return status;
    }
  };

  if (session?.user?.role === "SUPER_ADMIN") {
    return <div className="p-6">Yönlendiriliyor...</div>;
  }

  return (
    <>
      <div className="space-y-6">
      {isAdmin ? (
        <div className="space-y-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <h1 className="text-xl font-semibold">Hoş geldiniz, {session?.user?.name}</h1>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => router.push("/appointments/create")} className="px-3 py-2 rounded-md bg-primary hover:bg-primary/90 text-white text-sm whitespace-nowrap">+ Randevu Ekle</button>
              <div className="px-3 py-2 rounded-md bg-blue-50 text-blue-600 text-sm whitespace-nowrap">{moment().startOf("month").format("DD MMM")} - {moment().endOf("month").format("DD MMM")}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-5 border">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{Array.isArray(allAppointments) ? allAppointments.filter((a: any) => moment(a.date).isSame(moment(), "day") && a.status !== "CANCELED").length : 0}</div>
                <Calendar className="text-blue-600" />
              </div>
              <div className="text-sm text-gray-500 mt-1">Bugünkü Randevular</div>
              <div className="text-xs text-gray-400 mt-2">Toplam: {Array.isArray(allAppointments) ? allAppointments.length : 0}</div>
            </div>
            <div className="rounded-xl bg-white p-5 border">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{allPatients.length}</div>
                <Users className="text-purple-600" />
              </div>
              <div className="text-sm text-gray-500 mt-1">Toplam Hastalar</div>
              <div className="text-xs text-gray-400 mt-2">Son 30 gün: {Array.isArray(allPatients) ? allPatients.filter((p: any) => moment(p.createdAt).isAfter(moment().subtract(30, "days"))).length : 0}</div>
            </div>
            <div className="rounded-xl bg-white p-5 border">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{roomsAll.length}</div>
                <Building2 className="text-indigo-600" />
              </div>
              <div className="text-sm text-gray-500 mt-1">Toplam Odalar</div>
              <div className="text-xs text-green-600 mt-2">Uygun: {roomsAvailable.length}</div>
            </div>
            <div className="rounded-xl bg-white p-5 border">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{specialists.length}</div>
                <UserCheck className="text-teal-600" />
              </div>
              <div className="text-sm text-gray-500 mt-1">Toplam Uzmanlar</div>
            </div>
          </div>
        
        </div>
      ) : (
        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {cards.map(({ icon: Icon, label, value, color, iconColor, onClick }) => (
            <motion.div
              key={label}
              className={`rounded-2xl ${color} p-6 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 cursor-pointer`}
              whileHover={{ scale: 1.02 }}
              onClick={onClick}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                  <Icon className={iconColor} size={24} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient List Preview */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={20} />
              {isUzman ? "Hastalarım" : "Hasta Listesi"}
            </h3>
            <span className="text-sm text-gray-500">{stats.patients} Hasta</span>
          </div>
          
          <div className="space-y-3">
            {activityFeed.slice(0, 5).map((patient: any) => (
              <div 
                key={patient.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => router.push(`/patients/${patient.id}`)}
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    {patient.name?.charAt(0) || 'H'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {patient.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {patient.phone || 'Telefon bilgisi yok'}
                  </p>
                </div>
              </div>
            ))}
            
            {activityFeed.length === 0 && (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Henüz hasta kaydı yok</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
            <button 
              onClick={() => router.push('/patients')}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Tüm hastaları görüntüle →
            </button>
          </div>
        </motion.div>

        {/* Recent Appointments */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={20} />
              {isUzman ? "Randevularım" : "Yaklaşan Randevular"}
            </h3>
          </div>
          
          <div className="space-y-3">
            {recentAppointments.map((appointment: any) => (
              <div 
                key={appointment.id} 
                className="p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => router.push('/appointments')}
                >
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      {appointment.patient?.name?.charAt(0) || 'H'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.patient?.name || 'Hasta'}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(appointment);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400"
                          title="Not Ekle/Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Uzman: {appointment.specialist?.name || 'Belirtilmemiş'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tarih: {new Date(appointment.date).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {appointment.notes && (
                      <div className="mt-2 text-xs text-gray-500 italic bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600">
                        <span className="font-semibold">Not:</span> {appointment.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {recentAppointments.length === 0 && (
              <div className="text-center py-4">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Henüz randevu yok</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
            <button 
              onClick={() => router.push('/appointments')}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Tüm randevuları görüntüle →
            </button>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={20} />
              {isUzman ? "Son Aktivitelerim" : "Klinik Akışı"}
            </h3>
          </div>
          
          <div className="space-y-3">
            {/* Recent activity items - dynamic data */}
            <div className="space-y-3">
              {/* Recent payments */}
              {recentPayments.map((payment: any) => (
                <div key={`payment-${payment.id}`} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{payment.patient?.name}</span> {isUzman ? 'ödeme aldı' : 'ödeme yapıldı'} - ₺{payment.amount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Recent patients */}
              {activityFeed.slice(0, 2).map((patient: any) => (
                <div key={`patient-${patient.id}`} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{patient.name}</span> {isUzman ? 'hastam oldu' : 'hasta eklendi'}.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(patient.createdAt).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Recent appointments */}
              {recentAppointments.slice(0, 1).map((appointment: any) => (
                <div key={`appointment-${appointment.id}`} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{appointment.patient?.name}</span> {isUzman ? 'ile randevu oluşturuldu' : 'randevu oluşturuldu'}.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(appointment.createdAt).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Show message if no activity */}
              {recentPayments.length === 0 && activityFeed.length === 0 && recentAppointments.length === 0 && (
                <div className="text-center py-4">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Henüz aktivite yok</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Donut Chart */}
      {(isAdmin || isUzman) && (
        <div className="rounded-2xl bg-white p-6 border mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Gelir / Gider</h3>
              <p className="text-xs text-gray-500">Net: ₺{netTotal.toLocaleString("tr-TR")}</p>
            </div>
            <button className="px-3 py-1 rounded-md bg-gray-100 text-sm">Rapor Oluştur</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6366f1" }}></span>
                  <span>Gelir</span>
                </div>
                <span className="font-medium">₺{totalIncome.toLocaleString("tr-TR")}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }}></span>
                  <span>Gider</span>
                </div>
                <span className="font-medium">₺{totalExpense.toLocaleString("tr-TR")}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span>Net</span>
                <span className="font-semibold text-blue-600">₺{netTotal.toLocaleString("tr-TR")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      {/* Note Editing Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center justify-between">
              <span>Randevu Notu</span>
              <button onClick={() => setEditingAppointment(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{editingAppointment.patient?.name}</span> için randevu notu:
                </p>
                <textarea
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-gray-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Randevu hakkında notlar ekleyin..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingAppointment(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={updateNoteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <Save size={16} />
                  {updateNoteMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
