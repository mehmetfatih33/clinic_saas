"use client";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pill } from "lucide-react";

const itemSchema = z.object({
  medication: z.string().min(1, "İlaç adı gerekli"),
  dosage: z.string().min(1, "Doz gerekli"),
  frequency: z.string().min(1, "Sıklık gerekli"),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  patientId: z.string().min(1, "Hasta seçilmeli"),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "En az bir ilaç eklemelisiniz"),
});

type FormData = z.infer<typeof schema>;

export default function AddPrescriptionModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: { 
      items: [{ medication: "", dosage: "", frequency: "" }] 
    } 
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
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
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Ekleme hatası");
      show("Reçete başarıyla oluşturuldu ✅", "success");
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
        <span>Yeni Reçete</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-2xl my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Pill className="text-primary" />
                Yeni Reçete Oluştur
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Hasta</label>
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
                  {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Tanı (Opsiyonel)</label>
                  <Input {...register("diagnosis")} placeholder="Örn: Akut Farenjit" />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Notlar (Opsiyonel)</label>
                <Input {...register("notes")} placeholder="Ek açıklamalar..." />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">İlaç Listesi</h3>
                  <button 
                    type="button"
                    onClick={() => append({ medication: "", dosage: "", frequency: "" })}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <Plus size={14} /> İlaç Ekle
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-lg border relative group">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Input {...register(`items.${index}.medication`)} placeholder="İlaç Adı" />
                        {errors.items?.[index]?.medication && <p className="text-red-500 text-xs">{errors.items[index]?.medication?.message}</p>}
                      </div>
                      <div>
                        <Input {...register(`items.${index}.dosage`)} placeholder="Doz (Örn: 500mg)" />
                        {errors.items?.[index]?.dosage && <p className="text-red-500 text-xs">{errors.items[index]?.dosage?.message}</p>}
                      </div>
                      <div>
                        <Input {...register(`items.${index}.frequency`)} placeholder="Sıklık (Örn: 2x1)" />
                         {errors.items?.[index]?.frequency && <p className="text-red-500 text-xs">{errors.items[index]?.frequency?.message}</p>}
                      </div>
                      <div>
                        <Input {...register(`items.${index}.duration`)} placeholder="Süre (Örn: 1 hafta)" />
                      </div>
                      <div className="md:col-span-2">
                        <Input {...register(`items.${index}.instructions`)} placeholder="Kullanım Talimatı (Örn: Tok karnına)" />
                      </div>
                    </div>
                  </div>
                ))}
                {errors.items && <p className="text-red-500 text-xs">{errors.items.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Kaydediliyor..." : "Reçeteyi Kaydet"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
