"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const schema = z.object({
  patientId: z.string().min(1, "Hasta seçimi gerekli"),
  content: z.string().min(2, "Not çok kısa"),
  visibility: z.enum(["PRIVATE", "INTERNAL"]).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NoteModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { show } = useToast();
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/patients")
      .then((res) => res.json())
      .then((list) => setPatients(list?.map((p: any) => ({ id: p.id, name: p.name })) || []))
      .catch(() => setPatients([]));
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          content: data.content,
          visibility: data.visibility || "PRIVATE",
        }),
      });
      if (!res.ok) throw new Error("Ekleme hatası");
      show("Not başarıyla kaydedildi ✅", "success");
      reset();
      setOpen(false);
      onAdded();
    } catch {
      show("Bir hata oluştu ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-medium shadow hover:bg-primary/90"
        whileHover={{ scale: 1.05 }}
      >
        + Yeni Not
      </motion.button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Not Ekle</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Hasta</label>
                <Select value={selectedPatientId} onValueChange={(v) => setSelectedPatientId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hasta seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <textarea {...register("content")} placeholder="Not içeriği" rows={4} className="w-full border rounded p-2" />

              <div>
                <label className="block mb-2 text-sm font-medium">Görünürlük</label>
                <Select defaultValue="PRIVATE" onValueChange={(v) => {
                  (document.querySelector('input[name="visibility"]') as HTMLInputElement | null)?.setAttribute('value', v);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Özel</SelectItem>
                    <SelectItem value="INTERNAL">İç</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("visibility")} defaultValue="PRIVATE" />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-600">
                  İptal
                </button>
                <button type="submit" disabled={loading || !selectedPatientId} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded">
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
