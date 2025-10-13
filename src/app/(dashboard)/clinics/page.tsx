"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClinicsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Klinikler</h1>
        <Button className="bg-emerald-500 hover:bg-emerald-600">
          + Yeni Klinik
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Ana Klinik</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Adres</p>
              <p className="font-medium">İstanbul, Türkiye</p>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">Uzman Sayısı</p>
              <p className="font-medium">3 Uzman</p>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">Hasta Sayısı</p>
              <p className="font-medium">150 Hasta</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Şube Klinik</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Adres</p>
              <p className="font-medium">Ankara, Türkiye</p>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">Uzman Sayısı</p>
              <p className="font-medium">2 Uzman</p>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">Hasta Sayısı</p>
              <p className="font-medium">75 Hasta</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-8 text-gray-500">
        <p>🚧 Bu sayfa geliştirilme aşamasındadır. Sadece ADMIN rolü erişebilir.</p>
      </div>
    </div>
  );
}