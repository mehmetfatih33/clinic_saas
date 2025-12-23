"use client";
import { useState, useEffect } from "react";
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
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").optional().or(z.literal("")),
  branch: z.string().optional(),
  bio: z.string().optional(),
  hourlyFee: z.number().min(0, "Ücret 0'dan büyük olmalı").optional(),
});

type FormData = z.infer<typeof schema>;

interface EditSpecialistModalProps {
  specialist: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    specialist?: {
      branch?: string | null;
      bio?: string | null;
      hourlyFee?: number;
      defaultShare?: number;
    };
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSpecialistModal({ specialist, onClose, onSuccess }: EditSpecialistModalProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  });
  const { show } = useToast();

  useEffect(() => {
    if (specialist) {
      setValue("name", specialist.name);
      setValue("email", specialist.email);
      setValue("phone", specialist.phone || "");
      setValue("address", specialist.address || "");
      setValue("password", "");
      
      if (specialist.specialist) {
        setValue("branch", specialist.specialist.branch || "");
        setValue("bio", specialist.specialist.bio || "");
        setValue("hourlyFee", specialist.specialist.hourlyFee || 0);
      }
    }
  }, [specialist, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!specialist) return;
    setLoading(true);
    try {
      const payload: any = { ...data };
      if (!payload.password) delete payload.password;

      const res = await fetch(`/api/specialists/${specialist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({} as any));
        throw new Error(errorData.message || "Güncelleme hatası");
      }
      
      show("Uzman güncellendi ✅", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      show(error.message || "Hata oluştu ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!specialist) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-4">Uzman Düzenle</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Ad Soyad</label>
            <input 
              {...register("name")} 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="text-sm font-medium">E‑posta</label>
            <input 
              {...register("email")} 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Telefon</label>
            <input 
              {...register("phone")} 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Adres</label>
            <input
              {...register("address")}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Yeni Şifre (Opsiyonel)</label>
            <input 
              {...register("password")} 
              type="password"
              placeholder="Değiştirmek için girin"
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
          </div>

          <div>
            <label className="text-sm font-medium">Uzmanlık Alanı</label>
            <input 
              {...register("branch")} 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Saatlik Ücret (₺)</label>
            <input 
              {...register("hourlyFee", { valueAsNumber: true })} 
              type="number"
              min="0"
              step="50"
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Biyografi</label>
            <textarea 
              {...register("bio")} 
              rows={3}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
          </div>

          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              İptal
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
