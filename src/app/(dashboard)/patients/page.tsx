"use client";
import { useQuery } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export default function PatientsPage() {
  const { data, refetch, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) {
        throw new Error('Hastalar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      }
      const result = await res.json();
      // Ensure we always return an array
      return Array.isArray(result) ? result : [];
    },
  });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Hastalar</h1>
          <Link href="/patients/new">
            <Button>Yeni Hasta Ekle</Button>
          </Link>
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
                  <th className="p-3">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((p: Patient) => (
                  <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-sky-50/40 dark:hover:bg-gray-800">
                    <td className="p-3">
                      <Link href={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3">{p.phone || "-"}</td>
                    <td className="p-3">{p.email || "-"}</td>
                    <td className="p-3 text-center text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!data || data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Henüz hasta kaydı bulunmuyor. Yeni hasta ekleyerek başlayın.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}