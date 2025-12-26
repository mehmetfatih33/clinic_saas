"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, FileText } from "lucide-react";

const schema = z.object({
  patientId: z.string().min(1, "Hasta seçilmeli"),
  name: z.string().min(1, "Belge adı gerekli"),
  type: z.string().min(1, "Belge türü gerekli"),
});

type FormData = z.infer<typeof schema>;

export default function AddDocumentModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: { type: "RAPOR" }
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
    if (!selectedFile) {
        show("Lütfen bir dosya seçin", "error");
        return;
    }

    setLoading(true);
    try {
      // 1. Upload File
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Dosya yüklenemedi");
      
      const uploadData = await uploadRes.json();
      
      // 2. Create Document Record
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...data,
            url: uploadData.url,
            size: uploadData.size || selectedFile.size
        }),
      });

      if (!res.ok) throw new Error("Kayıt hatası");
      
      show("Belge başarıyla yüklendi ✅", "success");
      reset();
      setSelectedFile(null);
      setOpen(false);
      onAdded();
    } catch (error) {
      console.error(error);
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
        <Upload size={18} />
        <span>Belge Yükle</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="text-primary" />
                Yeni Belge Ekle
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <label className="block mb-2 text-sm font-medium">Belge Adı</label>
                <Input {...register("name")} placeholder="Örn: Kan Tahlili Sonucu" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Belge Türü</label>
                <Select onValueChange={(v) => setValue("type", v)} defaultValue="RAPOR">
                  <SelectTrigger>
                    <SelectValue placeholder="Tür seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAPOR">Rapor</SelectItem>
                    <SelectItem value="ANALIZ">Analiz/Tahlil</SelectItem>
                    <SelectItem value="GORUNTULEME">Görüntüleme (MR/Röntgen)</SelectItem>
                    <SelectItem value="DIGER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Dosya Seç (Görsel veya PDF)</label>
                <Input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            if (file.size > 3 * 1024 * 1024) {
                                show("Dosya boyutu 3MB'dan büyük olamaz", "error");
                                e.target.value = "";
                                setSelectedFile(null);
                                return;
                            }
                            setSelectedFile(file);
                        } else {
                            setSelectedFile(null);
                        }
                    }}
                    className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Maksimum dosya boyutu: 3MB</p>
                {selectedFile && <p className="text-xs text-green-600 mt-1">Seçilen: {selectedFile.name}</p>}
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
                  {loading ? "Yükleniyor..." : "Yükle ve Kaydet"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
