"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  patientId: z.string().min(1, "Hasta seçimi gerekli"),
  specialistId: z.string().min(1, "Uzman seçimi gerekli"),
  splitClinic: z.number().min(0).max(100),
  splitDoctor: z.number().min(0).max(100),
  customAmount: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddAssignmentModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      splitClinic: 50,
      splitDoctor: 50,
    }
  });
  const { show } = useToast();
  const [customAmountTl, setCustomAmountTl] = useState("");

  // Watch split values to ensure they add up to 100
  const splitClinic = watch("splitClinic");
  const splitDoctor = watch("splitDoctor");

  // Fetch data for dropdowns
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      return res.json();
    },
  });

  const { data: specialists } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      return res.json();
    },
  });

  // Ücret tarifesi kaldırıldı; yalnızca özel tutar kullanılacak

  const selectedSpecialistId = watch("specialistId");
  useEffect(() => {
    if (!selectedSpecialistId) return;
    const sp = Array.isArray(specialists) ? specialists.find((s: any) => s.id === selectedSpecialistId) : null;
    const hf = sp?.specialist?.hourlyFee || 0;
    if (hf && hf > 0) {
      setCustomAmountTl(String(hf));
      setValue("customAmount", Math.round(Number(hf) * 100));
    }
  }, [selectedSpecialistId, specialists, setValue]);

  const onSubmit = async (data: FormData) => {
    if (data.splitClinic + data.splitDoctor !== 100) {
      show("Klinik ve uzman payları toplamı 100 olmalıdır. Lütfen değerleri kontrol edin. ❌", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          specialistId: data.specialistId,
          customAmount: data.customAmount ?? (customAmountTl ? Math.round(Number(customAmountTl) * 100) : undefined),
          splitClinic: data.splitClinic,
          splitDoctor: data.splitDoctor,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ekleme hatası");
      }
      
      show("Atama başarıyla oluşturuldu ✅", "success");
      reset();
      setOpen(false);
      onAdded();
    } catch (error: any) {
      show(error.message || "Atama oluşturulurken bir hata oluştu. Lütfen tekrar deneyin. ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSplitChange = (field: "splitClinic" | "splitDoctor", value: number) => {
    setValue(field, value);
    setValue(field === "splitClinic" ? "splitDoctor" : "splitClinic", 100 - value);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white px-4 py-2 font-medium shadow hover:opacity-90"
        whileHover={{ scale: 1.05 }}
      >
        + Yeni Atama
      </motion.button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Yeni Atama Oluştur</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hasta</label>
                <select 
                  {...register("patientId")} 
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Hasta seçin</option>
                  {patients?.map((patient: any) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
                {errors.patientId && <p className="text-red-500 text-sm mt-1">{errors.patientId.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Uzman</label>
                <select 
                  {...register("specialistId")} 
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Uzman seçin</option>
                  {specialists?.map((specialist: any) => (
                    <option key={specialist.id} value={specialist.id}>{specialist.name}</option>
                  ))}
                </select>
                {errors.specialistId && <p className="text-red-500 text-sm mt-1">{errors.specialistId.message}</p>}
              </div>
              
              {/* Ücret tarifesi kaldırıldı */}

              <div>
                <label className="block text-sm font-medium mb-1">Özel Tutar (₺)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={customAmountTl}
                  onChange={(e) => {
                    setCustomAmountTl(e.target.value);
                    const v = e.target.value ? Math.round(Number(e.target.value) * 100) : undefined;
                    setValue("customAmount", v as any);
                  }}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Klinik Payı (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={splitClinic}
                    onChange={(e) => handleSplitChange("splitClinic", parseInt(e.target.value) || 0)}
                    className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Uzman Payı (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={splitDoctor}
                    onChange={(e) => handleSplitChange("splitDoctor", parseInt(e.target.value) || 0)}
                    className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Toplam: {splitClinic + splitDoctor}% {splitClinic + splitDoctor !== 100 && "(100% olmalı)"}
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
                  disabled={loading || splitClinic + splitDoctor !== 100} 
                  className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50"
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
