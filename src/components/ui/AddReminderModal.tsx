"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

const schema = z.object({
  patientId: z.string().optional(),
  type: z.enum(["SMS", "EMAIL"]),
  scheduledFor: z.string().min(1, "Tarih ve saat gerekli"),
  message: z.string().min(1, "Mesaj gerekli"),
});

type FormData = z.infer<typeof schema>;

export default function AddReminderModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: { type: "SMS" } 
  });
  const { show } = useToast();
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => {
         const list = Array.isArray(data) ? data : (data.items || []);
         setPatients(list.map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => setPatients([]));
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId || null,
          type: data.type,
          scheduledFor: data.scheduledFor,
          message: data.message,
        }),
      });
      if (!res.ok) throw new Error("Ekleme hatası");
      show("Hatırlatıcı başarıyla oluşturuldu ✅", "success");
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
      <button 
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90"
      >
        <Plus size={18} />
        <span>Yeni Hatırlatıcı</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Hatırlatıcı Ekle</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Hasta (Opsiyonel)</label>
                <Select onValueChange={(v) => setValue("patientId", v)}>
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

              <div>
                <label className="block mb-2 text-sm font-medium">Tip</label>
                <Select onValueChange={(v) => setValue("type", v as any)} defaultValue="SMS">
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMAIL">E-posta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Zaman</label>
                <Input type="datetime-local" {...register("scheduledFor")} />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Mesaj</label>
                <textarea 
                  {...register("message")} 
                  placeholder="Hatırlatma mesajı..." 
                  rows={3} 
                  className="w-full border rounded-md p-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors">
                  {loading ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
