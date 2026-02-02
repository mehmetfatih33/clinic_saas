"use client";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

export default function NewSpecialistNotePage() {
  return (
    <ToastProvider>
      <NewSpecialistNoteContent />
    </ToastProvider>
  );
}

function NewSpecialistNoteContent() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const id = params?.id as string;
  const [patientId, setPatientId] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "INTERNAL">("PRIVATE");
  const [content, setContent] = useState("");

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Hastalar yüklenemedi");
      const json = await res.json();
      return Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/specialists/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, content, visibility }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Not kaydedilemedi");
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["specialist-notes", id] });
      show("Not kaydedildi ✅", "success");
      router.push(`/specialists/${id}/notes`);
    },
    onError: (err: any) => {
      show(err?.message || "Hata oluştu ❌", "error");
    },
  });

  return (
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
              <label className="text-sm">Hasta</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Hasta seçin</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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
              <Button variant="outline" onClick={() => router.push(`/specialists/${id}/notes`)}>İptal</Button>
              <Button onClick={() => create.mutate()} disabled={!patientId || !content || create.isPending}>
                {create.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

