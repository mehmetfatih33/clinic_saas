"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  name: z.string().min(2, "İsim çok kısa"),
  email: z.string().email("Geçerli e-posta girin"),
  phone: z
    .string()
    .min(10, "Telefon numarası çok kısa")
    .regex(/^\+?\d{10,15}$/u, "Geçerli telefon numarası girin"),
  address: z.string().optional(),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").optional(),
  branch: z.string().optional(),
  bio: z.string().optional(),
  hourlyFee: z.number().min(0, "Ücret 0'dan büyük olmalı").optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddSpecialistModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  });
  const { show } = useToast();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({} as any));
        const msg = errorData.message || errorData.error || res.statusText || "Ekleme hatası";
        throw new Error(msg);
      }
      
      show("Uzman başarıyla eklendi ✅", "success");
      reset();
      setOpen(false);
      onAdded();
    } catch (error: any) {
      show(error.message || "Uzman eklenirken bir hata oluştu. Lütfen tekrar deneyin. ❌", "error");
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
        + Yeni Uzman
      </motion.button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Uzman Ekle</h2>
            <p className="text-xs text-gray-500 mb-2">Zorunlu alanlar: Ad Soyad, E‑posta, Telefon</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ad Soyad *</label>
                <input 
                  {...register("name")} 
                  placeholder="Ad Soyad" 
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="text-sm font-medium">E‑posta *</label>
                <input 
                  {...register("email")} 
                  placeholder="E-posta" 
                  type="email"
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Telefon *</label>
                <input 
                  {...register("phone")} 
                  placeholder="Telefon (örn: +905551234567)" 
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Adres</label>
                <input
                  {...register("address")}
                  placeholder="Adres (opsiyonel)"
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              
              <div>
                <input 
                  {...register("password")} 
                  placeholder="Şifre (Opsiyonel)" 
                  type="password"
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Boş bırakırsanız otomatik şifre oluşturulup e-posta ile gönderilir.
                </p>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
              
              <div>
                <input 
                  {...register("branch")} 
                  placeholder="Uzmanlık Alanı" 
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
              </div>
              
              <div>
                <input 
                  {...register("hourlyFee", { valueAsNumber: true })} 
                  placeholder="Saatlik Ücret (₺)" 
                  type="number"
                  min="0"
                  step="50"
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
                {errors.hourlyFee && <p className="text-red-500 text-sm mt-1">{errors.hourlyFee.message}</p>}
              </div>
              
              <div>
                <textarea 
                  {...register("bio")} 
                  placeholder="Kısa Biyografi" 
                  rows={3}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                />
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setOpen(false)} 
                  className="px-3 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !isValid} 
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                >
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
