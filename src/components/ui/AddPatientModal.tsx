"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  name: z.string().min(2, "İsim çok kısa"),
  phone: z.string().optional(),
  email: z.string().email("Geçersiz e-posta").optional().or(z.literal("")),
  birthDate: z.string().optional(),
  diagnosis: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddPatientModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { show } = useToast();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        // Hata detayını göster: API'den gelen 'error' varsa onu, yoksa 'message'ı kullan
        const errorMessage = errData.error || errData.message || "Ekleme hatası";
        throw new Error(errorMessage);
      }
      show("Hasta başarıyla eklendi ✅", "success");
      reset();
      setOpen(false);
      onAdded();
    } catch (error: any) {
      show(error.message || "Hasta eklenirken bir hata oluştu. Lütfen tekrar deneyin. ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary text-white px-4 py-2 font-medium shadow hover:bg-primary/90"
        whileHover={{ scale: 1.05 }}
      >
        + Yeni Hasta
      </motion.button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Hasta Ekle</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input {...register("name")} placeholder="Ad Soyad" className="w-full border rounded p-2" />
              <input {...register("phone")} placeholder="Telefon" className="w-full border rounded p-2" />
              <input {...register("email")} placeholder="E-posta" className="w-full border rounded p-2" />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 ml-1">Doğum Tarihi</label>
                <input {...register("birthDate")} type="date" className="w-full border rounded p-2" />
              </div>
              <textarea {...register("diagnosis")} placeholder="Tanılar / Notlar" rows={3} className="w-full border rounded p-2" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-600">
                  İptal
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded">
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