"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function LogsPage() {
  const { data: session } = useSession();
  const [limit, setLimit] = useState<number>(200);
  const { data, isLoading } = useQuery({
    queryKey: ["logs", session?.user?.clinicId, limit],
    queryFn: async () => {
      const res = await fetch(`/api/logs?limit=${limit}`);
      if (!res.ok) throw new Error("Loglar yüklenemedi");
      return res.json();
    },
    enabled: !!session?.user?.clinicId,
  });

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">Loglar</h1>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Gösterilecek kayıt</label>
            <select
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1 text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((prev) => Math.min(prev + 100, 1000))}
            >
              + Load More
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-3">Tarih</th>
                    <th className="text-left p-3">Kullanıcı</th>
                    <th className="text-left p-3">Aksiyon</th>
                    <th className="text-left p-3">Varlık</th>
                    <th className="text-left p-3">Varlık ID</th>
                    <th className="text-left p-3">Detay</th>
                    <th className="p-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(data) && data.length > 0 ? (
                    data.map((log: any) => (
                      <tr key={log.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.createdAt))}</td>
                        <td className="p-3">{log.actor?.name || log.actor?.email || "-"}</td>
                        <td className="p-3">{log.action}</td>
                        <td className="p-3">{log.entity}</td>
                        <td className="p-3 font-mono">{log.entityId}</td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <p className="text-sm">{log.meta?.message || ""}</p>
                            {log.meta && (
                              <pre className="max-w-[420px] whitespace-pre-wrap break-words text-xs text-gray-500">{JSON.stringify(log.meta)}</pre>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(String(log.entityId || ""))}
                          >
                            Kopyala
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={7}>Kayıt yok</td>
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
