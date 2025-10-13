"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Patient {
  id: string;
  name: string;
  fee?: number;
  totalPayments?: number;
  totalSessions?: number;
  createdAt: string;
}

interface SpecialistData {
  id: string;
  name: string;
  email: string;
  specialist: {
    branch: string;
    defaultShare: number;
    hourlyFee: number;
    bio: string;
    totalPatients: number;
    totalRevenue: number;
    avgRevenue: number;
  };
  patients: Patient[];
}

export default function SpecialistDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading } = useQuery<SpecialistData>({
    queryKey: ["specialist", id],
    queryFn: async () => {
      const res = await fetch(`/api/specialists/${id}`);
      if (!res.ok) throw new Error("Uzman bilgileri alınamadı");
      return res.json();
    },
  });

  if (isLoading) return <p className="p-6 text-gray-500">Yüklüyor...</p>;
  if (!data) return <p className="p-6 text-red-500">Veri bulunamadı.</p>;

  const revenueChartData = data.patients.map((p) => ({
    name: p.name,
    revenue: p.totalPayments || 0,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Uzman Başlık Kartı */}
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-gray-600">{data.email}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Branş</p>
            <p className="font-medium">{data.specialist.branch}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Varsayılan Pay</p>
            <p className="font-medium">{data.specialist.defaultShare}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Saatlik Ücret</p>
            <p className="font-medium">{data.specialist.hourlyFee} ₺</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Toplam Hasta</p>
            <p className="font-medium">{data.specialist.totalPatients}</p>
          </div>
        </CardContent>
      </Card>

      {/* Performans Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Toplam Gelir</p>
            <p className="text-2xl font-semibold text-green-700">
              {data.specialist.totalRevenue.toLocaleString("tr-TR")} ₺
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Ortalama Hasta Geliri</p>
            <p className="text-2xl font-semibold text-blue-700">
              {data.specialist.avgRevenue.toLocaleString("tr-TR")} ₺
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Hasta Sayısı</p>
            <p className="text-2xl font-semibold text-yellow-700">
              {data.specialist.totalPatients}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gelir Grafiği */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Hasta Bazlı Gelir Grafiği</h2>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hasta Tablosu */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Hasta Detayları</h2>
        </CardHeader>
        <CardContent>
          {data.patients.length === 0 ? (
            <p className="text-gray-500">Bu uzmana atanmış hasta bulunmuyor.</p>
          ) : (
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Hasta</th>
                  <th className="text-left px-4 py-2">Seans</th>
                  <th className="text-left px-4 py-2">Ücret</th>
                  <th className="text-left px-4 py-2">Ödeme</th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2">{p.totalSessions ?? 0}</td>
                    <td className="px-4 py-2">{p.fee?.toLocaleString("tr-TR") ?? "-"} ₺</td>
                    <td className="px-4 py-2 text-green-700 font-medium">
                      {p.totalPayments?.toLocaleString("tr-TR") ?? 0} ₺
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="pt-6">
        <Link href="/specialists">
          <Button variant="outline">← Uzman Listesine Dön</Button>
        </Link>
      </div>
    </div>
  );
}