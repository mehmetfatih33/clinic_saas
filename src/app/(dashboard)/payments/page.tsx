"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Payment {
  id: string;
  amount: number;
  specialistCut: number;
  clinicCut: number;
  createdAt: string;
  patient: { name: string };
  specialist: { name: string };
}

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments/list");
      if (!res.ok) throw new Error("Ödemeler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
      return res.json();
    },
  });

  if (isLoading) return <p className="p-6 text-gray-500">Yükleniyor...</p>;
  if (!data) return <p className="p-6 text-red-500">Veri yok.</p>;

  const filtered = data.filter((p) =>
    p.patient.name.toLowerCase().includes(search.toLowerCase()) ||
    p.specialist.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);
  const totalSpecialistCut = filtered.reduce((sum, p) => sum + p.specialistCut, 0);
  const totalClinicCut = filtered.reduce((sum, p) => sum + p.clinicCut, 0);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">💳 Ödeme Geçmişi</h1>
          <p className="text-sm text-gray-600 mt-2">
            Toplam {filtered.length} ödeme kaydı
          </p>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Hasta veya uzman ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mb-4"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Toplam Ödeme</p>
                <p className="text-2xl font-semibold text-green-700">
                  {totalAmount.toLocaleString("tr-TR")} ₺
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Uzman Payları</p>
                <p className="text-2xl font-semibold text-blue-700">
                  {totalSpecialistCut.toLocaleString("tr-TR")} ₺
                </p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Klinik Payları</p>
                <p className="text-2xl font-semibold text-purple-700">
                  {totalClinicCut.toLocaleString("tr-TR")} ₺
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Hasta</th>
                  <th className="text-left px-4 py-2">Uzman</th>
                  <th className="text-left px-4 py-2">Tutar</th>
                  <th className="text-left px-4 py-2">Uzman Payı</th>
                  <th className="text-left px-4 py-2">Klinik Payı</th>
                  <th className="text-left px-4 py-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      {search ? "Arama sonucu bulunamadı" : "Henüz ödeme kaydı yok"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{p.patient.name}</td>
                      <td className="px-4 py-2">{p.specialist.name}</td>
                      <td className="px-4 py-2 text-green-700 font-medium">
                        {p.amount.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-4 py-2">{p.specialistCut.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-4 py-2">{p.clinicCut.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-4 py-2">
                        {new Date(p.createdAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
