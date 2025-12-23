"use client";
import { useQuery } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const { data, refetch, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) {
        throw new Error('Hastalar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      }
      const result = await res.json();
      const items = Array.isArray(result) ? result : (Array.isArray(result?.items) ? result.items : []);
      return items;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: true,
  });

  const filteredPatients = (Array.isArray(data) ? data : []).filter((patient) => {
    const term = search.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(term) ||
      patient.phone?.includes(term) ||
      patient.email?.toLowerCase().includes(term)
    );
  }) || [];

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Hastalar</h1>
          <Link href="/patients/new">
            <Button>Yeni Hasta Ekle</Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Hasta adı, telefon veya e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>

        {isLoading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3">Ad Soyad</th>
                  <th className="text-left p-3">Telefon</th>
                  <th className="text-left p-3">E-posta</th>
                  <th className="text-left p-3">Kayıt Tarihi</th>
                  <th className="text-left p-3">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      {search ? "Sonuç bulunamadı." : "Kayıtlı hasta yok."}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {patient.name}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {patient.phone || "-"}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {patient.email || "-"}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {new Date(patient.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="p-3">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="outline" size="sm">
                            Detay
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
