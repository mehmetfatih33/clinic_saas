"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Raporlar</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Hasta İstatistikleri</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Bu bölümde hasta sayıları ve demografik veriler görüntülenecek.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Gelir Raporları</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Aylık ve yıllık gelir analizleri burada yer alacak.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Uzman Performansı</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Uzmanların performans metrikleri görüntülenecek.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-8 text-gray-500">
        <p>🚧 Bu sayfa geliştirilme aşamasındadır. Sadece ADMIN rolü erişebilir.</p>
      </div>
    </div>
  );
}