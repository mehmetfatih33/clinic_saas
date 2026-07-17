"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, ArrowRight, User, Calendar, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface StepAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  mode?: "modal" | "page";
}

export default function StepAppointmentModal({ open, onClose, mode = "modal" }: StepAppointmentModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    patientId: "",
    specialistId: "",
    roomId: "",
    date: "",
    selectedDate: "",
    selectedTime: "",
    duration: 60,
    notes: "",
  });
  
  const { show: showToast } = useToast();
  const qc = useQueryClient();

  // Uzmanlar için specialistId'yi otomatik ayarla
  React.useEffect(() => {
    if (session?.user?.role === "UZMAN" && session?.user?.id) {
      setForm(prev => ({ ...prev, specialistId: session.user.id }));
    }
  }, [session]);

  const { data: availability = [], isLoading: availabilityLoading } = useQuery<
    { time: string; status: "busy" | "free" }[]
  >({
    queryKey: ["availability", form.specialistId, form.selectedDate, form.duration],
    queryFn: async () => {
      if (!form.specialistId || !form.selectedDate) return [];
      const sp = new URLSearchParams({
        specialistId: form.specialistId,
        date: form.selectedDate,
        duration: String(form.duration),
      });
      const res = await fetch(`/api/availability?${sp.toString()}`);
      if (!res.ok) return [];
      const json = await res.json().catch(() => ({}));
      return Array.isArray(json?.items) ? json.items : [];
    },
    enabled: !!form.specialistId && !!form.selectedDate,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Check if time slot is available
  const isTimeSlotAvailable = (time: string) =>
    availability.find((slot) => slot.time === time)?.status !== "busy";

  // Handle time slot selection
  const handleTimeSelect = (time: string) => {
    if (!form.selectedDate) {
      showToast("Lütfen önce tarih seçin", "error");
      return;
    }
    
    if (!isTimeSlotAvailable(time)) {
      showToast("Seçilen saat dolu. Lütfen farklı bir saat seçin.", "error");
      return;
    }
    
    const dateTime = `${form.selectedDate}T${time}`;
    setForm({ ...form, selectedTime: time, date: dateTime, roomId: "" });
  };

  // Fetch patients for dropdown
  const { data: patients = [], isLoading: patientsLoading, isError: patientsError } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Hastalar yüklenemedi");
      const json = await res.json();
      return Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
    },
    enabled: true, // Modal açılmadan önce yüklenmeye başlasın
    staleTime: 1000 * 60 * 5,
  });

  // Fetch specialists for dropdown
  const { data: specialists = [], isLoading: specialistsLoading } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Uzmanlar yüklenemedi");
      const json = await res.json();
      return Array.isArray(json) ? json : (Array.isArray(json?.experts) ? json.experts : []);
    },
    enabled: true, // Modal açılmadan önce yüklenmeye başlasın (Eager fetching)
    staleTime: 1000 * 60 * 5, // 5 dakika boyunca önbellekten oku
  });
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", form.selectedDate, form.selectedTime, form.duration],
    queryFn: async () => {
      if (!form.date) return [] as any[];
      try {
        const qs = `?date=${encodeURIComponent(form.date)}&duration=${form.duration}`;
        const res = await fetch(`/api/rooms${qs}`);
        if (!res.ok) {
           console.error("Rooms fetch error:", res.status, res.statusText);
           return [];
        }
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
        return list.filter((r: any) => r && r.id);
      } catch (error) {
        console.error("Rooms query error:", error);
        return [];
      }
    },
    enabled: !!form.date,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Get patient's assigned specialist
  const selectedPatient = patients.find((p: any) => p.id === form.patientId);
  const assignedSpecialist = selectedPatient?.assignments?.[0]?.specialist;

  // Automatically select specialist when patient is chosen
  const handlePatientSelect = (patientId: string) => {
    setForm({ ...form, patientId });
    
    // Find patient's assigned specialist and auto-select
    const patient = patients.find((p: any) => p.id === patientId);
    if (patient?.assignments?.[0]?.specialist?.id) {
      setForm(prev => ({ 
        ...prev, 
        patientId, 
        specialistId: patient.assignments[0].specialist.id 
      }));
    }
  };

  const createAppointment = useMutation({
    mutationFn: async () => {
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
      setForm({ 
        patientId: "", 
        specialistId: "", 
        roomId: "",
        date: "", 
        selectedDate: "", 
        selectedTime: "", 
        duration: 60, 
        notes: "" 
      });
      setCurrentStep(1);
      if (mode === "modal") {
        onClose();
      } else {
        router.push("/appointments");
      }
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("✅ Randevu başarıyla oluşturuldu", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin. ❌", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.specialistId || !form.roomId || !form.date || !form.selectedTime) {
      showToast("Tüm bilgiler doldurulmalıdır. Lütfen eksik alanları tamamlayın.", "error");
      return;
    }
    createAppointment.mutate();
  };

  const nextStep = () => {
    if (currentStep === 1 && !form.specialistId) {
      showToast("Uzman seçimi zorunludur.", "error");
      return;
    }
    if (currentStep === 2 && !form.patientId) {
      showToast("Hasta seçimi zorunludur.", "error");
      return;
    }
    if (currentStep === 3 && (!form.selectedDate || !form.selectedTime)) {
      showToast("Tarih ve saat seçimi zorunludur.", "error");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetModal = () => {
    setCurrentStep(1);
    setForm({ 
      patientId: "", 
      specialistId: "", 
      roomId: "",
      date: "", 
      selectedDate: "", 
      selectedTime: "", 
      duration: 60, 
      notes: "" 
    });
    onClose();
  };

  if (mode === "modal" && !open) return null;

  return (
    <div className={mode === "modal" ? "fixed inset-0 bg-black/50 flex items-center justify-center z-50" : ""}>
      <div className={mode === "modal" ? "bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border shadow-xl" : "bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-auto border"}>
        
        {/* Header with Steps */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Yeni Randevu Oluştur
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              }`}>
                👨‍⚕️
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 2 ? "bg-primary" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              }`}>
                <User size={16} />
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 3 ? "bg-primary" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              }`}>
                <Calendar size={16} />
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 4 ? "bg-primary" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 4 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              }`}>
                <Clock size={16} />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Adım {currentStep}/4: {
              currentStep === 1 ? "Uzman Seçimi" : 
              currentStep === 2 ? "Hasta Seçimi" : 
              currentStep === 3 ? "Tarih ve Saat" :
              "Oda Seçimi"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {currentStep === 1 && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  👨‍⚕️ Uzman Seçin
                </label>
                {session?.user?.role === "UZMAN" ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-200 text-sm">Kendi randevunuzu oluşturuyorsunuz</p>
                  </div>
                ) : (
                  <Select value={form.specialistId} onValueChange={(value) => setForm({ ...form, specialistId: value })}>
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Uzman seçin..." className="text-gray-900 dark:text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      {specialistsLoading ? (
                        <SelectItem value="loading" disabled>Uzmanlar yükleniyor...</SelectItem>
                      ) : specialists.length === 0 ? (
                        <SelectItem value="empty" disabled>Kayıtlı uzman yok</SelectItem>
                      ) : (
                        specialists.map((specialist: any) => (
                          <SelectItem 
                            key={specialist.id} 
                            value={specialist.id}
                            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            {specialist.name} {specialist.specialist?.branch && `(${specialist.specialist.branch})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  👤 Hasta Seçin
                </label>
                <Select value={form.patientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Hasta seçin..." className="text-gray-900 dark:text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    {patientsLoading && <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>}
                    {patientsError && <SelectItem value="error" disabled>Hata oluştu</SelectItem>}
                    {!patientsLoading && !patientsError && patients.length === 0 && (
                      <SelectItem value="empty" disabled>Kayıtlı hasta yok</SelectItem>
                    )}
                    {patients.map((patient: any) => (
                      <SelectItem 
                        key={patient.id} 
                        value={patient.id}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="flex flex-col">
                          <span>{patient.name}</span>
                          {patient.assignments?.[0]?.specialist && (
                            <span className="text-xs text-gray-500">
                              Uzman: {patient.assignments[0].specialist.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.patientId && selectedPatient && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Seçilen Hasta:</strong> {selectedPatient.name}
                  </p>
                </div>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    📅 Tarih Seçin
                  </label>
                  <Input
                    type="date"
                    value={form.selectedDate}
                    onChange={(e) => setForm({ ...form, selectedDate: e.target.value, selectedTime: "", date: "", roomId: "" })}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>

                {form.selectedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      🕐 Saat Seçin
                    </label>
                    {availabilityLoading ? (
                      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                        Saatler yükleniyor...
                      </div>
                    ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availability.map(({ time }) => {
                        const isAvailable = isTimeSlotAvailable(time);
                        const isSelected = form.selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => handleTimeSelect(time)}
                            disabled={!isAvailable}
                            className={`p-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-primary text-white border-2 border-primary"
                                : isAvailable
                                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-primary/10 dark:hover:bg-primary/20"
                                : "bg-red-100 text-red-500 border border-red-300 cursor-not-allowed opacity-50"
                            }`}
                          >
                            {time}
                            {!isAvailable && (
                              <div className="text-xs mt-1">Dolu</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    )}
                    
                    {form.selectedTime && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>Seçilen Zaman:</strong> {form.selectedDate} - {form.selectedTime}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ⏱️ Süre (dakika)
                  </label>
                  <Select value={form.duration.toString()} onValueChange={(value) => setForm({ ...form, duration: Number(value), selectedTime: "", date: "", roomId: "" })}>
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue className="text-gray-900 dark:text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectItem value="30" className="text-gray-900 dark:text-white">30 dakika</SelectItem>
                      <SelectItem value="45" className="text-gray-900 dark:text-white">45 dakika</SelectItem>
                      <SelectItem value="60" className="text-gray-900 dark:text-white">60 dakika</SelectItem>
                      <SelectItem value="90" className="text-gray-900 dark:text-white">90 dakika</SelectItem>
                      <SelectItem value="120" className="text-gray-900 dark:text-white">120 dakika</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    📝 Notlar (Opsiyonel)
                  </label>
                  <Textarea
                    placeholder="Randevu hakkında notlar..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="min-h-[80px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">🏥 Oda Seçin</label>
                  <Select value={form.roomId} onValueChange={(value) => setForm({ ...form, roomId: value })}>
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Oda seçin..." className="text-gray-900 dark:text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      {roomsLoading ? (
                         <SelectItem value="loading" disabled>Odalar yükleniyor...</SelectItem>
                      ) : rooms.length === 0 ? (
                        <SelectItem value="empty" disabled className="text-gray-500">Uygun oda yok</SelectItem>
                      ) : (
                        rooms.map((room: any) => (
                          <SelectItem 
                            key={room.id} 
                            value={String(room.id)}
                            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            {room.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <div className="flex space-x-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft size={16} className="mr-1" />
                  Geri
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={resetModal}>
                İptal
              </Button>
              
              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  İleri
                  <ArrowRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createAppointment.isPending || !form.patientId || !form.specialistId || !form.roomId || !form.selectedDate || !form.selectedTime}
                >
                  {createAppointment.isPending ? "Oluşturuluyor..." : "Randevuyu Oluştur"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
