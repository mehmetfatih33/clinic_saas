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

interface StepAppointmentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function StepAppointmentModal({ open, onClose }: StepAppointmentModalProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    patientId: "",
    specialistId: "",
    date: "",
    selectedDate: "",
    selectedTime: "",
    duration: 60,
    notes: "",
  });
  
  // Available time slots (8 AM to 7 PM)
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // Get existing appointments for selected date
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["appointments", form.selectedDate],
    queryFn: async () => {
      if (!form.selectedDate) return [];
      const res = await fetch(`/api/appointments?date=${form.selectedDate}`);
      if (!res.ok) return [];
      const appointments = await res.json();
      return appointments.filter((apt: any) => {
        const aptDate = new Date(apt.date).toISOString().split('T')[0];
        return aptDate === form.selectedDate;
      });
    },
    enabled: !!form.selectedDate,
  });
  
  const { show: showToast } = useToast();
  const qc = useQueryClient();

  // Uzmanlar için specialistId'yi otomatik ayarla
  React.useEffect(() => {
    if (session?.user?.role === "UZMAN" && session?.user?.id) {
      setForm(prev => ({ ...prev, specialistId: session.user.id }));
    }
  }, [session]);

  // Check if time slot is available
  const isTimeSlotAvailable = (time: string) => {
    if (!form.selectedDate || !form.specialistId) return true;
    
    return !existingAppointments.some((apt: any) => {
      const aptTime = new Date(apt.date).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return aptTime === time && apt.specialistId === form.specialistId;
    });
  };

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
    setForm({ ...form, selectedTime: time, date: dateTime });
  };

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

  // Fetch specialists for dropdown - only show after patient is selected
  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Uzmanlar yüklenemedi");
      return res.json();
    },
    enabled: open && form.patientId !== "",
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
        date: "", 
        selectedDate: "", 
        selectedTime: "", 
        duration: 60, 
        notes: "" 
      });
      setCurrentStep(1);
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
    if (!form.patientId || !form.specialistId || !form.date || !form.selectedTime) {
      showToast("Tüm bilgiler doldurulmalıdır. Lütfen eksik alanları tamamlayın.", "error");
      return;
    }
    createAppointment.mutate();
  };

  const nextStep = () => {
    if (currentStep === 1 && !form.patientId) {
      showToast("Hasta seçimi zorunludur. Lütfen bir hasta seçin.", "error");
      return;
    }
    if (currentStep === 2 && !form.specialistId) {
      showToast("Uzman seçimi zorunludur. Lütfen bir uzman seçin.", "error");
      return;
    }
    if (currentStep < 3) {
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
      date: "", 
      selectedDate: "", 
      selectedTime: "", 
      duration: 60, 
      notes: "" 
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border shadow-xl">
        
        {/* Header with Steps */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Yeni Randevu Oluştur
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                <User size={16} />
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 2 ? "bg-blue-500" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                👨‍⚕️
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 3 ? "bg-blue-500" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                <Calendar size={16} />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Adım {currentStep}/3: {
              currentStep === 1 ? "Hasta Seçimi" : 
              currentStep === 2 ? "Uzman Onayı" : 
              "Tarih ve Detaylar"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Step 1: Patient Selection */}
          {currentStep === 1 && (
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
                  {assignedSpecialist && (
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      <strong>Atanmış Uzman:</strong> {assignedSpecialist.name}
                      {assignedSpecialist.specialist?.branch && ` (${assignedSpecialist.specialist.branch})`}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 2: Specialist Confirmation */}
          {currentStep === 2 && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  👨‍⚕️ Uzman Onayı
                </label>
                {assignedSpecialist ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {assignedSpecialist.name}
                        </p>
                        {assignedSpecialist.specialist?.branch && (
                          <p className="text-sm text-green-600 dark:text-green-300">
                            {assignedSpecialist.specialist.branch}
                          </p>
                        )}
                      </div>
                      <div className="text-green-600 dark:text-green-400">
                        ✅ Otomatik Seçildi
                      </div>
                    </div>
                  </div>
                ) : session?.user?.role === "UZMAN" ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      Kendi randevunuzu oluşturuyorsunuz
                    </p>
                  </div>
                ) : (
                  <Select value={form.specialistId} onValueChange={(value) => setForm({ ...form, specialistId: value })}>
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Uzman seçin..." className="text-gray-900 dark:text-white" />
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
                )}
              </div>
            </>
          )}

          {/* Step 3: Date and Time Selection */}
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
                    onChange={(e) => setForm({ ...form, selectedDate: e.target.value, selectedTime: "", date: "" })}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>

                {form.selectedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      🕐 Saat Seçin
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => {
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
                                ? "bg-blue-500 text-white border-2 border-blue-600"
                                : isAvailable
                                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-blue-800"
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
                  <Select value={form.duration.toString()} onValueChange={(value) => setForm({ ...form, duration: Number(value) })}>
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
              
              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep}>
                  İleri
                  <ArrowRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createAppointment.isPending || !form.patientId || !form.specialistId || !form.selectedDate || !form.selectedTime}
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