"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<"7D" | "30D" | "90D">("30D");

  // Fetch data
  const { data: appointments = [] } = useQuery({
    queryKey: ["analytics-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["analytics-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["analytics-patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  // Calculate stats based on dateRange
  const now = new Date();
  const startDate = dateRange === "7D" ? subDays(now, 7) : dateRange === "30D" ? subDays(now, 30) : subDays(now, 90);

  const filteredAppointments = appointments.filter((a: any) => new Date(a.date) >= startDate);
  const filteredTransactions = transactions.filter((t: any) => new Date(t.date) >= startDate);
  const filteredPatients = patients.filter((p: any) => new Date(p.createdAt) >= startDate);

  const totalIncome = filteredTransactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const netIncome = totalIncome - totalExpense;

  // Chart Data Preparation
  const days = eachDayOfInterval({ start: startDate, end: now });
  const chartData = days.map(day => {
    const dayAppointments = filteredAppointments.filter((a: any) => isSameDay(new Date(a.date), day)).length;
    const dayIncome = filteredTransactions
      .filter((t: any) => isSameDay(new Date(t.date), day) && t.type === "INCOME")
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    
    return {
      date: format(day, "dd MMM", { locale: tr }),
      randevu: dayAppointments,
      gelir: dayIncome
    };
  });

  const statusData = [
    { name: "Tamamlanan", value: filteredAppointments.filter((a: any) => a.status === "COMPLETED").length, color: "#22c55e" },
    { name: "Planlanan", value: filteredAppointments.filter((a: any) => a.status === "SCHEDULED").length, color: "#3b82f6" },
    { name: "İptal", value: filteredAppointments.filter((a: any) => a.status === "CANCELED").length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Raporlar ve Analizler</h1>
          <p className="text-muted-foreground">Klinik performansınızı detaylı inceleyin.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          {(["7D", "30D", "90D"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                dateRange === range 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-gray-100"
              }`}
            >
              {range === "7D" ? "7 Gün" : range === "30D" ? "30 Gün" : "3 Ay"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Toplam Gelir</h3>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">₺{totalIncome.toLocaleString('tr-TR')}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            Seçili dönem
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Net Kar</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">₺{netIncome.toLocaleString('tr-TR')}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Giderler düşüldükten sonra
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Randevular</h3>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{filteredAppointments.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredAppointments.filter((a: any) => a.status === "COMPLETED").length} tamamlanan
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Yeni Hastalar</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{filteredPatients.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Toplam {patients.length} kayıtlı
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pb-0">
            <h3 className="text-lg font-semibold">Gelir Analizi</h3>
            <p className="text-sm text-muted-foreground">Günlük gelir hareketleri</p>
          </div>
          <div className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₺${value}`} 
                  />
                  <Tooltip 
                    formatter={(value) => [`₺${Number(value).toLocaleString('tr-TR')}`, 'Gelir']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="gelir" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pb-0">
            <h3 className="text-lg font-semibold">Randevu Durumu</h3>
            <p className="text-sm text-muted-foreground">Randevu dağılımı</p>
          </div>
          <div className="p-6">
            <div className="h-[300px] w-full flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">Veri yok</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
