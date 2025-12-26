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
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddTaskModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" } 
  });
  const { show } = useToast();
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!open) return;
    
    const fetchData = async () => {
      try {
        const [specialistsRes, staffRes] = await Promise.all([
          fetch("/api/specialists"),
          fetch("/api/staff")
        ]);

        const specialistsData = await specialistsRes.json();
        const staffData = await staffRes.json();

        const specialists = Array.isArray(specialistsData) ? specialistsData : (specialistsData.experts || []);
        const staffMembers = staffData.items || [];

        const allUsers = [
          ...specialists.map((p: any) => ({ id: p.id, name: `${p.name} (Uzman)` })),
          ...staffMembers.map((p: any) => ({ id: p.id, name: `${p.name} (${p.role === "ADMIN" ? "Yönetici" : "Asistan"})` }))
        ];
        
        setStaff(allUsers);
      } catch (error) {
        console.error("Kullanıcılar yüklenemedi:", error);
        setStaff([]);
      }
    };

    fetchData();
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate,
          assignedToId: data.assignedToId || null,
        }),
      });
      if (!res.ok) throw new Error("Ekleme hatası");
      show("Görev başarıyla oluşturuldu ✅", "success");
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
        className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-medium shadow hover:bg-primary/90 flex items-center gap-2"
        whileHover={{ scale: 1.02 }}
      >
        <span>+ Yeni Görev</span>
      </motion.button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Görev Oluştur</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Başlık</label>
                <Input {...register("title")} placeholder="Görev başlığı" />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Açıklama</label>
                <textarea 
                  {...register("description")} 
                  placeholder="Detaylar..." 
                  rows={3} 
                  className="w-full border rounded-md p-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block mb-2 text-sm font-medium">Öncelik</label>
                    <Select onValueChange={(v) => setValue("priority", v as any)} defaultValue="MEDIUM">
                    <SelectTrigger>
                        <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="LOW">Düşük</SelectItem>
                        <SelectItem value="MEDIUM">Orta</SelectItem>
                        <SelectItem value="HIGH">Yüksek</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium">Son Tarih</label>
                    <Input type="date" {...register("dueDate")} />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Atanan Kişi</label>
                <Select value={watch("assignedToId") || ""} onValueChange={(v) => setValue("assignedToId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Personel seçin (Opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
