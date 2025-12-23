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
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "ASISTAN", "PERSONEL"]),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface EditStaffModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: "ADMIN" | "ASISTAN" | "PERSONEL";
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStaffModal({ user, onClose, onSuccess }: EditStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  });
  const { show } = useToast();

  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("email", user.email);
      setValue("phone", user.phone || "");
      setValue("role", user.role);
      setValue("password", ""); // Password is meant to be reset only if entered
    }
  }, [user, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      // Remove empty password to avoid sending it
      const payload: any = { ...data };
      if (!payload.password) delete payload.password;

      const res = await fetch(`/api/staff/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({} as any));
        throw new Error(errorData.message || "Güncelleme hatası");
      }
      
      show("Kullanıcı güncellendi ✅", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      show(error.message || "Hata oluştu ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({} as any));
        throw new Error(errorData.message || "Silme hatası");
      }
      
      show("Kullanıcı silindi ✅", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      show(error.message || "Hata oluştu ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-lg font-semibold mb-4">Çalışan Düzenle</h2>
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
          </div>
          
          <div>
            <label className="text-sm font-medium">Rol</label>
            <select 
              {...register("role")} 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="ASISTAN">Asistan</option>
              <option value="ADMIN">Admin</option>
              <option value="PERSONEL">Personel</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Yeni Şifre (Opsiyonel)</label>
            <input 
              {...register("password")} 
              type="password"
              placeholder="Değiştirmek için girin"
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex justify-between mt-6">
            <button 
              type="button" 
              onClick={handleDelete}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
              disabled={loading}
            >
              Sil
            </button>
            <div className="flex gap-2">
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
          </div>
        </form>
      </motion.div>
    </div>
  );
}
