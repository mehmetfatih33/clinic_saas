"use client";
"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Users, CreditCard, DollarSign, Calendar, UserCheck, Clock, FileText, Activity } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, payments: 0, income: 0 });
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const isUzman = session?.user?.role === "UZMAN";

  // Fetch appointments for recent activity (role-based)
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ["recent-appointments", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) return [];
      const appointments = await res.json();
      return appointments.slice(0, 3); // Get latest 3
    },
    enabled: !!session?.user
  });

  // Fetch activity feed data (role-based)
  const { data: activityFeed = [] } = useQuery({
    queryKey: ["activity-feed", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const patients = await res.json();
      return patients.slice(0, 5); // Get latest 5 patients
    },
    enabled: !!session?.user
  });

  // Fetch payments for activity feed (role-based)
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["recent-payments", session?.user?.role],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      if (!res.ok) return [];
      const payments = await res.json();
      return payments.slice(0, 3); // Get latest 3 payments
    },
    enabled: !!session?.user
  });

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
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
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
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
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
                className="p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => router.push('/appointments')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      {appointment.patient?.name?.charAt(0) || 'H'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.patient?.name || 'Hasta'}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
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
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
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
              {recentPayments.map((payment: any, index: number) => (
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
              {activityFeed.slice(0, 2).map((patient: any, index: number) => (
                <div key={`patient-${patient.id}`} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
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
              {recentAppointments.slice(0, 1).map((appointment: any, index: number) => (
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
    </div>
  );
}