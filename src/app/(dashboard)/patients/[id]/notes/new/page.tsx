"use client";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

export default function NewPatientNotePage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const id = params?.id as string;
  const [visibility, setVisibility] = useState<"PRIVATE" | "INTERNAL">("PRIVATE");
  const [content, setContent] = useState("");
  const [appointmentId, setAppointmentId] = useState("");

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["patient-appointments", id],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}/appointments`);
      if (!res.ok) throw new Error("Randevular yüklenemedi");
      return res.json();
    },
    enabled: !!id,
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id, content, visibility, appointmentId: appointmentId || null }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Not kaydedilemedi");
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["patient-notes", id] });
      show("Not kaydedildi ✅", "success");
      router.push(`/patients/${id}/notes`);
    },
    onError: (err: any) => {
      show(err?.message || "Hata oluştu ❌", "error");
    },
  });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Yeni Not</h1>
        </div>
        <Card>
          <CardHeader>
            <p className="text-sm text-gray-600">Not bilgilerini doldurun</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm">Seans (opsiyonel)</label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Seans seçin (opsiyonel)</option>
                {[...appointments]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((a: any, idx: number) => (
                    <option key={a.id} value={a.id}>
                      {`Seans #${idx + 1} — ${new Date(a.date).toLocaleString("tr-TR")}`}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Gizlilik</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="PRIVATE">Gizli (yazar + admin)</option>
                <option value="INTERNAL">İç (tüm klinik ekibi)</option>
              </select>
            </div>

            <div>
              <label className="text-sm">İçerik</label>
              <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Kapsamlı yazın; tüm önemli ayrıntıları ekleyebilirsiniz.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push(`/patients/${id}/notes`)}>İptal</Button>
              <Button onClick={() => create.mutate()} disabled={!content || create.isPending}>
                {create.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ToastProvider>
  );
}
