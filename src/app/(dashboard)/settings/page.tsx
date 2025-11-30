"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type WorkDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WorkSchedule = Record<WorkDayKey, { closed: boolean; open?: string; close?: string }>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { show } = useToast();

  const { data: plan } = useQuery<{ slug?: string; features?: string[] } | null>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) return null;
      return res.json();
    },
  });
  const roomFeatureAllowed = !!(plan && ((plan.slug === "full") || (Array.isArray(plan.features) && plan.features.includes("room-tracking")) || (plan.slug === "")));

  const { data: clinic } = useQuery<{ id: string; name: string; workSchedule?: WorkSchedule | null }>({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const res = await fetch("/api/clinic/settings");
      if (!res.ok) throw new Error("Ayarlar yüklenemedi");
      return res.json();
    },
  });

  const [name, setName] = useState<string>("");
  const [schedule, setSchedule] = useState<WorkSchedule>({
    mon: { closed: false, open: "09:00", close: "18:00" },
    tue: { closed: false, open: "09:00", close: "18:00" },
    wed: { closed: false, open: "09:00", close: "18:00" },
    thu: { closed: false, open: "09:00", close: "18:00" },
    fri: { closed: false, open: "09:00", close: "18:00" },
    sat: { closed: true },
    sun: { closed: true },
  });

  // Init local state when clinic loads
  React.useEffect(() => {
    if (clinic) {
      setName(clinic.name || "");
      if (clinic.workSchedule) setSchedule(clinic.workSchedule as WorkSchedule);
    }
  }, [clinic]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clinic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, workSchedule: schedule }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Ayarlar güncellenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-settings"] });
      show("Ayarlar güncellendi ✅", "success");
    },
    onError: (err: any) => {
      show(err.message || "Hata oluştu ❌", "error");
    }
  });

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["rooms", "all"],
    queryFn: async () => {
      const res = await fetch("/api/rooms?all=1");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Odalar yüklenemedi");
      }
      return res.json();
    },
    enabled: roomFeatureAllowed,
  });
  const [newRoomName, setNewRoomName] = useState("");
  const addRoom = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Oda oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewRoomName("");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "all"] });
      show("Oda eklendi ✅", "success");
    },
    onError: (err: any) => show(err.message || "Hata oluştu ❌", "error")
  });

  const toggleRoom = useMutation({
    mutationFn: async (room: any) => {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: room.id, isActive: !room.isActive })
      });
      if (!res.ok) throw new Error("Oda güncellenemedi");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] })
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Çalışanlar yüklenemedi");
      return res.json();
    }
  });
  const [staffForm, setStaffForm] = useState({ name: "", email: "", phone: "", password: "", role: "ASISTAN" });
  const addStaff = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Çalışan eklenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setStaffForm({ name: "", email: "", phone: "", password: "", role: "ASISTAN" });
      qc.invalidateQueries({ queryKey: ["staff"] });
      show("Çalışan eklendi ✅", "success");
    },
    onError: (err: any) => show(err?.message || "Hata oluştu ❌", "error")
  });

  const dayLabel: Record<WorkDayKey, string> = { mon: "Pzt", tue: "Sal", wed: "Çar", thu: "Per", fri: "Cum", sat: "Cmt", sun: "Paz" };

  return (
    <ToastProvider>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>

        <Tabs defaultValue="clinic">
          <TabsList>
            <TabsTrigger value="clinic">Klinik</TabsTrigger>
            <TabsTrigger value="staff">Çalışanlar</TabsTrigger>
          </TabsList>

          <TabsContent value="clinic">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Klinik Bilgileri</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm">Klinik Adı</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm">Çalışma Günleri ve Saatleri</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {(Object.keys(schedule) as WorkDayKey[]).map((k) => (
                      <div key={k} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{dayLabel[k]}</span>
                          <Select value={schedule[k].closed ? "closed" : "open"} onValueChange={(val) => {
                            setSchedule({ ...schedule, [k]: val === "closed" ? { closed: true } : { closed: false, open: schedule[k].open || "09:00", close: schedule[k].close || "18:00" } });
                          }}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Açık</SelectItem>
                              <SelectItem value="closed">Kapalı</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!schedule[k].closed && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Input type="time" value={schedule[k].open} onChange={(e) => setSchedule({ ...schedule, [k]: { ...schedule[k], open: e.target.value } })} />
                            <Input type="time" value={schedule[k].close} onChange={(e) => setSchedule({ ...schedule, [k]: { ...schedule[k], close: e.target.value } })} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Çalışanlar (Uzmanlar Hariç)</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="İsim" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  <Input placeholder="E‑posta" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                  <Input placeholder="Telefon" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                  <Input placeholder="Şifre" type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                  <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASISTAN">Asistan</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="PERSONEL">Personel (Şifresiz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => addStaff.mutate()} 
                  disabled={addStaff.isPending || !staffForm.name || !/.+@.+\..+/.test(staffForm.email) || ((staffForm.role === "ADMIN" || staffForm.role === "ASISTAN") && (!staffForm.password || staffForm.password.length < 6))}
                >
                  {addStaff.isPending ? "Ekleniyor..." : "Ekle"}
                </Button>

                <div className="mt-4 space-y-2">
                  {staff.length === 0 ? (
                    <p className="text-gray-500">Kayıtlı çalışan yok</p>
                  ) : (
                    staff.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between border rounded p-2">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-sm text-gray-500">{s.email} • {s.role}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ToastProvider>
  );
}
