"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function LogsPage() {
  const { data: session } = useSession();
  const [limit, setLimit] = useState<number>(200);
  const [clinicName, setClinicName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["logs", session?.user?.clinicId, limit, clinicName, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (clinicName) params.set("clinicName", clinicName);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Loglar yüklenemedi");
      return res.json();
    },
    enabled: !!session?.user?.clinicId,
  });

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const handleCleanup = async () => {
    if (!confirm("1 yıldan eski tüm log kayıtları silinecek. Emin misiniz?")) return;
    
    try {
      const res = await fetch("/api/logs/cleanup?days=365", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      alert(json.message);
      window.location.reload(); 
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Loglar</h1>
            <div className="flex items-center gap-2">
              {(isSuperAdmin || session?.user?.role === "ADMIN") && (
                 <Button 
                   variant="destructive" 
                   size="sm"
                   onClick={handleCleanup}
                 >
                   Eski Logları Temizle (1 Yıl)
                 </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((prev) => Math.min(prev + 100, 1000))}
              >
                + Daha Fazla Yükle ({limit})
              </Button>
            </div>
          </div>
          
          <div className="mt-4 grid gap-4 md:grid-cols-4 items-end bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            {isSuperAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Klinik Adı</label>
                <Input 
                  placeholder="Klinik ara..." 
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="bg-white"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Başlangıç Tarihi</label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Bitiş Tarihi</label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Kayıt Limiti</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[100, 200, 500, 1000].map((n) => (
                  <option key={n} value={n}>{n} Kayıt</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <p className="text-gray-500 animate-pulse">Yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Tarih</th>
                    {isSuperAdmin && <th className="text-left p-3 font-medium text-gray-600">Klinik</th>}
                    <th className="text-left p-3 font-medium text-gray-600">Kullanıcı</th>
                    <th className="text-left p-3 font-medium text-gray-600">Aksiyon</th>
                    <th className="text-left p-3 font-medium text-gray-600">Detay</th>
                    <th className="p-3 font-medium text-gray-600">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.isArray(data) && data.length > 0 ? (
                    data.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-gray-500">
                          {new Intl.DateTimeFormat("tr-TR", { 
                            day: "2-digit", month: "2-digit", year: "numeric", 
                            hour: "2-digit", minute: "2-digit" 
                          }).format(new Date(log.createdAt))}
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3 font-medium text-primary">
                            {log.clinic?.name || "-"}
                          </td>
                        )}
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.actor?.name || "-"}</span>
                            <span className="text-xs text-gray-400">{log.actor?.email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 max-w-md">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{log.meta?.message || "-"}</p>
                            {log.meta && Object.keys(log.meta).length > 1 && (
                              <details className="text-xs text-gray-500 cursor-pointer">
                                <summary className="hover:text-primary">Diğer Detaylar</summary>
                                <pre className="mt-1 p-2 bg-gray-50 rounded border overflow-x-auto">
                                  {JSON.stringify(log.meta, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigator.clipboard.writeText(String(log.entityId || ""))}
                            title="ID Kopyala"
                          >
                            <span className="sr-only">Kopyala</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-8 text-center text-gray-500" colSpan={isSuperAdmin ? 6 : 5}>
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
