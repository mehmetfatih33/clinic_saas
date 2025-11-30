"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/ToastProvider";
import { useSession } from "next-auth/react";

interface AddAppointmentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddAppointmentModal({ open, onClose }: AddAppointmentModalProps) {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    patientId: "",
    specialistId: "",
    roomId: "",
    date: "",
    duration: 60,
    notes: "",
  });
  
  const { show: showToast } = useToast();
  const qc = useQueryClient();

  // Fetch patients for dropdown
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Hastalar yüklenemedi");
      return res.json();
    },
    enabled: open,
  });

  // Fetch specialists for dropdown
  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Uzmanlar yüklenemedi");
      return res.json();
    },
    enabled: open,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", form.date, form.duration],
    queryFn: async () => {
      if (!form.date) return [] as any[];
      const qs = `?date=${encodeURIComponent(form.date)}&duration=${form.duration}`;
      const res = await fetch(`/api/rooms${qs}`);
      if (!res.ok) throw new Error("Odalar yüklenemedi");
      return res.json();
    },
    enabled: open && !!form.date,
  });

  const { data: timeoffs = [] } = useQuery<any[]>({
    queryKey: ["timeoff", form.specialistId],
    queryFn: async () => {
      if (!form.specialistId) return [];
      const res = await fetch(`/api/specialists/${form.specialistId}/timeoff`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!form.specialistId,
  });

  const { data: clinicSettings } = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const res = await fetch("/api/clinic/settings");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open,
  });

  // Uzmanlar için specialistId'yi otomatik ayarla
  React.useEffect(() => {
    if (session?.user?.role === "UZMAN" && session?.user?.id) {
      setForm(prev => ({ ...prev, specialistId: session.user.id }));
    }
  }, [session]);

  const createAppointment = useMutation({
    mutationFn: async () => {
      const start = new Date(form.date);
      const blocked = timeoffs.some((t: any) => {
        const s = new Date(t.start).getTime();
        const e = t.end ? new Date(t.end).getTime() : undefined;
        const x = start.getTime();
        return e ? x >= s && x <= e : x >= s; // if end missing, treat as from start onwards
      });
      if (blocked) {
        throw new Error("Seçilen tarih uzman için tatil/izin gününde");
      }
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Randevu oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      setForm({ patientId: "", specialistId: "", roomId: "", date: "", duration: 60, notes: "" });
      onClose();
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("✅ Randevu başarıyla oluşturuldu", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin. ❌", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.specialistId || !form.roomId || !form.date) {
      showToast("Hasta, uzman, oda ve tarih seçimi zorunludur", "error");
      return;
    }
    // Clinic working hours validation
    if (clinicSettings?.workSchedule) {
      const dt = new Date(form.date);
      const map: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat"> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
      const key = map[dt.getDay()];
      const ws = clinicSettings.workSchedule[key];
      if (ws?.closed) {
        showToast("Seçilen gün klinik kapalı", "error");
        return;
      }
      const mins = (h: number, m: number) => h * 60 + m;
      const ch = dt.getHours();
      const cm = dt.getMinutes();
      const [oh, om] = (ws?.open || "08:00").split(":").map(Number);
      const [xh, xm] = (ws?.close || "18:00").split(":").map(Number);
      const cur = mins(ch, cm);
      if (cur < mins(oh, om) || cur > mins(xh, xm)) {
        showToast("Seçilen saat çalışma saatleri dışında", "error");
        return;
      }
    }
    createAppointment.mutate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Yeni Randevu Oluştur</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Hasta</label>
            <Select value={form.patientId} onValueChange={(value) => setForm({ ...form, patientId: value })}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Hasta seçin" className="text-gray-900 dark:text-white" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                {patients.map((patient: any) => (
                  <SelectItem 
                    key={patient.id} 
                    value={patient.id}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        {/* Specialist Selection - Sadece Admin ve Asistan görebilir */}
        {session?.user?.role !== "UZMAN" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Uzman</label>
              <Select value={form.specialistId} onValueChange={(value) => setForm({ ...form, specialistId: value })}>
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Uzman seçin" className="text-gray-900 dark:text-white" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  {specialists.map((specialist: any) => (
                    <SelectItem 
                      key={specialist.id} 
                      value={specialist.id}
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {specialist.name} {specialist.specialist?.branch && `(${specialist.specialist.branch})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Uzmanlar için bilgi mesajı */}
          {session?.user?.role === "UZMAN" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Uzman</label>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
                <p className="text-blue-800 dark:text-blue-200">Kendi randevunuzu oluşturuyorsunuz</p>
              </div>
            </div>
        )}

        {/* Room Selection */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Oda</label>
          <Select value={form.roomId} onValueChange={(value) => setForm({ ...form, roomId: value })}>
            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder={form.date ? "Oda seçin" : "Önce tarih/saat seçin"} className="text-gray-900 dark:text-white" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
              {rooms.length === 0 && form.date && (
                <SelectItem value="" disabled className="text-gray-500">Uygun oda yok</SelectItem>
              )}
              {rooms.map((room: any) => (
                <SelectItem 
                  key={room.id} 
                  value={room.id}
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date & Time */}
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Tarih ve Saat</label>
            <Input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
            {form.specialistId && timeoffs.length > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                Bu uzman için bazı tarihler kapalı. Seçtiğiniz saat kapalıysa uyarı alırsınız.
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Süre (dakika)</label>
            <Input
              type="number"
              min="15"
              max="240"
              step="15"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Notlar (Opsiyonel)</label>
            <Textarea
              placeholder="Randevu hakkında notlar..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[80px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="submit"
              disabled={createAppointment.isPending || !form.patientId || !form.specialistId || !form.roomId || !form.date}
            >
              {createAppointment.isPending ? "Oluşturuluyor..." : "Randevu Oluştur"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
