"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Edit2, Check, X, FileText, Calendar } from "lucide-react";

interface PatientDetailsProps {
  params: Promise<{ id: string }>;
}

// Payment Section Component
function PaymentSection({ 
  patientId, 
  patientName,
  hasSpecialist 
}: { 
  patientId: string; 
  patientName: string;
  hasSpecialist: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { show: showToast } = useToast();
  const queryClient = useQueryClient();

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast("İç tutarsız miktar", "error");
      return;
    }

    if (!hasSpecialist) {
      showToast("Bu hasta henüz bir uzmana atanmamış. Lütfen önce uzman atayın.", "error");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientId, 
          amount: parseFloat(amount) 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Ödeme kaydedilemedi");
      }

      showToast(
        `🎉 ${patientName} için ₺${parseFloat(amount).toFixed(2)} ödeme kaydedildi!\n` +
        `Uzman payı: ₺${data.payment.specialistCut.toFixed(2)} (${data.payment.share})\n` +
        `Klinik payı: ₺${data.payment.clinicCut.toFixed(2)}`,
        "success"
      );

      // Reset form and refresh data
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      await queryClient.invalidateQueries({ queryKey: ["payments", patientId] });
      await queryClient.invalidateQueries({ queryKey: ["specialists"] });
    } catch (error: any) {
      console.error("💥 Payment error:", error);
      showToast(error.message || "Ödeme kaydedilirken hata oluştu", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasSpecialist && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ Bu hasta henüz bir uzmana atanmamış. Ödeme kaydedebilmek için önce uzman atayın.
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Ödeme tutarı (₺)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1"
          min="0"
          step="0.01"
          disabled={!hasSpecialist || isProcessing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isProcessing && hasSpecialist) {
              handlePayment();
            }
          }}
        />
        <Button 
          onClick={handlePayment} 
          disabled={!hasSpecialist || isProcessing || !amount}
          className="min-w-[120px]"
        >
          {isProcessing ? "Kaydediliyor..." : "💳 Ödeme Al"}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        ℹ️ Ödeme otomatik olarak uzman ve klinik arasında pay edilecektir.
      </p>
    </div>
  );
}

// Appointment History Component
function AppointmentHistory({ patientId }: { patientId: string }) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/appointments`);
      if (!res.ok) throw new Error("Randevu geçmişi alınamadı");
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✅ Tamamlandı';
      case 'CANCELED':
        return '❌ İptal Edildi';
      case 'SCHEDULED':
        return '📅 Planlanmış';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Randevu Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          📅 Randevu Geçmişi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments && appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments.map((appointment: any) => {
              const appointmentDate = new Date(appointment.date);
              const now = new Date();
              const isPast = appointmentDate < now;
              
              return (
                <div key={appointment.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {appointmentDate.toLocaleDateString("tr-TR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs border ${
                          getStatusColor(appointment.status)
                        }`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">🕐 Saat:</span> {appointmentDate.toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        <p>
                          <span className="font-medium">⏱️ Süre:</span> {appointment.duration} dakika
                        </p>
                        <p>
                          <span className="font-medium">👨‍⚕️ Uzman:</span> {appointment.specialist?.name || "Belirtilmemiş"}
                        </p>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                          <span className="font-medium">📝 Notlar:</span> {appointment.notes}
                        </div>
                      )}
                      
                      {/* Session Notes Count */}
                      {appointment.sessionNotes && appointment.sessionNotes.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          🧠 {appointment.sessionNotes.length} seans notu var
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xs ${
                        isPast ? "text-gray-500" : "text-blue-600 font-medium"
                      }`}>
                        {isPast ? "Geçmiş" : "Gelecek"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Oluşturulma: {new Date(appointment.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Henüz randevu geçmişi bulunmuyor</p>
            <p className="text-gray-400 text-xs mt-1">
              Bu hasta için henüz randevu oluşturulmamış
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function PatientNotes({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "INTERNAL">("PRIVATE");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const { show: showToast } = useToast();

  // Fetch appointments for this patient
  const { data: appointments = [] } = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notes", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/notes`);
      if (!res.ok) throw new Error("Notlar yüklenemedi");
      return res.json();
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientId, 
          content: note,
          visibility,
          appointmentId 
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Not kaydedilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setNote("");
      setVisibility("PRIVATE");
      setAppointmentId(null);
      qc.invalidateQueries({ queryKey: ["notes", patientId] });
      showToast("✅ Not başarıyla kaydedildi", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "❌ Not kaydedilemedi", "error");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          🧠 Uzman Notları
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Yeni not ekle..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
            />
            
            <div className="grid grid-cols-2 gap-3">
              {/* Visibility Selection */}
              <div className="space-y-1">
                <label className="text-xs text-gray-600 font-medium">Görünürlük</label>
                <Select value={visibility} onValueChange={(v: "PRIVATE" | "INTERNAL") => setVisibility(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">🔒 Özel (Sadece Ben + Admin)</SelectItem>
                    <SelectItem value="INTERNAL">🏥 Dahili (Tüm Personel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Appointment Selection */}
              <div className="space-y-1">
                <label className="text-xs text-gray-600 font-medium">Seans (Opsiyonel)</label>
                <Select value={appointmentId || "none"} onValueChange={(v) => setAppointmentId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Genel Not" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">📝 Genel Not</SelectItem>
                    {appointments.map((apt: any) => (
                      <SelectItem key={apt.id} value={apt.id}>
                        📅 {new Date(apt.date).toLocaleDateString("tr-TR", { 
                          day: "numeric", 
                          month: "short", 
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => createNote.mutate()}
              disabled={!note.trim() || createNote.isPending}
              size="sm"
              className="w-full"
            >
              {createNote.isPending ? "Kaydediliyor..." : "Not Ekle"}
            </Button>
          </div>

          <div className="border-t pt-4">
            {isLoading ? (
              <p className="text-gray-500 text-sm">Yükleniyor...</p>
            ) : data && data.length > 0 ? (
              <ul className="space-y-3">
                {data.map((n: any) => (
                  <li key={n.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{n.content}</p>
                      <span className="text-xs px-2 py-1 rounded-full ml-2 shrink-0 " 
                        style={{
                          backgroundColor: n.visibility === "PRIVATE" ? "#fee" : "#efe",
                          color: n.visibility === "PRIVATE" ? "#c33" : "#393"
                        }}>
                        {n.visibility === "PRIVATE" ? "🔒 Özel" : "🏥 Dahili"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {n.appointment
                          ? `📅 Seans (${new Date(n.appointment.date).toLocaleDateString("tr-TR")})`
                          : "📝 Genel Not"}
                      </span>
                      <span>
                        {n.author.name} ({n.author.role}) • {new Date(n.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                Henüz not bulunmuyor
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientDetailsPage({ params }: PatientDetailsProps) {
  // ✅ Unwrap params Promise using React.use()
  const { id } = React.use(params);
  const { data: session } = useSession();
  const { show: showToast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN";

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) throw new Error("Hasta verisi alınamadı.");
      return res.json();
    },
  });

  // Fetch payment history for this patient
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      const res = await fetch(`/api/payments?patientId=${id}`);
      if (!res.ok) throw new Error("Ödeme geçmişi alınamadı");
      return res.json();
    },
  });

  // Fetch specialists for dropdown
  const { data: specialists } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Uzmanlar yüklenemedi");
      return res.json();
    },
    enabled: canEdit,
  });

  // Editable field component
  function EditableField({
    label,
    value,
    field,
    type = "text",
    options,
    onUpdate,
  }: {
    label: string;
    value: string | number;
    field: string;
    type?: "text" | "email" | "tel" | "select";
    options?: { value: string; label: string }[];
    onUpdate: () => void;
  }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(
      field === "assignedToId" && !value ? "none" : (value?.toString() || "")
    );

    const updateMutation = useMutation({
      mutationFn: async (newValue: string) => {
        // Convert "none" to null for specialist assignment
        const processedValue = (field === "assignedToId" && newValue === "none") ? null : (newValue || null);
        const updateData: any = { [field]: processedValue };
        
        // Special handling for specialist assignment
        if (field === "assignedToId") {
          updateData.oldAssignedToId = patient?.assignedToId;
        }

        const res = await fetch(`/api/patients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error("Güncelleme başarısız");
        return res.json();
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["patient", id] });
        await queryClient.invalidateQueries({ queryKey: ["specialists"] });
        showToast(`${label} başarıyla güncellendi 🎉`, "success");
        setIsEditing(false);
        onUpdate?.();
      },
      onError: (error: any) => {
        console.error("💥 updateMutation hata:", error);
        showToast(error.message || "Güncelleme sırasında hata oluştu", "error");
        setEditValue(
          field === "assignedToId" && !value ? "none" : (value?.toString() || "")
        );
      },
    });

    const handleSave = () => {
      if (editValue !== value?.toString()) {
        updateMutation.mutate(editValue);
      } else {
        setIsEditing(false);
      }
    };

    const handleCancel = () => {
      setEditValue(
        field === "assignedToId" && !value ? "none" : (value?.toString() || "")
      );
      setIsEditing(false);
    };

    if (!canEdit) {
      return (
        <div>
          <label className="text-sm font-medium text-gray-600">{label}</label>
          <p className={(value && value !== "none") ? "" : "text-gray-400"}>
            {type === "select" && options && value 
              ? (value === "none" ? "Uzman Atanmamış" : options.find(opt => opt.value === value)?.label || value)
              : value || "Belirtilmemiş"
            }
          </p>
        </div>
      );
    }

    return (
      <div>
        <label className="text-sm font-medium text-gray-600">{label}</label>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            {type === "select" && options ? (
              <Select value={editValue || "none"} onValueChange={setEditValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uzman Atanmamış</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                placeholder={`${label} girin`}
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 w-8 p-0"
            >
              <Check size={14} className="text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X size={14} className="text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <p className={(value && value !== "none") ? "flex-1" : "flex-1 text-gray-400"}>
              {type === "select" && options && value 
                ? (value === "none" ? "Uzman Atanmamış" : options.find(opt => opt.value === value)?.label || value)
                : value || "Belirtilmemiş"
              }
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditValue(
                  field === "assignedToId" && !value ? "none" : (value?.toString() || "")
                );
                setIsEditing(true);
              }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 size={12} className="text-gray-500" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="container mx-auto py-8">
          <div className="p-6 text-gray-400">Hasta bilgileri yükleniyor...</div>
        </div>
      </ToastProvider>
    );
  }

  if (!patient) {
    return (
      <ToastProvider>
        <div className="container mx-auto py-8">
          <div className="text-center">Hasta bulunamadı</div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Hasta Detayları</h1>
            {canEdit && (
              <p className="text-sm text-gray-600 mt-1">
                📝 Düzenleme yetkiniz var - alanlara tıklayarak düzenleme yapabilirsiniz
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/patients">
              <Button variant="outline">← Hasta Listesi</Button>
            </Link>
            <Link href="/patients/new">
              <Button>Yeni Hasta</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Patient Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Hasta Bilgileri
                {canEdit && (
                  <span className="text-sm font-normal text-gray-500">
                    Düzenleme için alanlara tıklayın
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Ad Soyad"
                value={patient.name}
                field="name"
                type="text"
                onUpdate={() => {}}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="E-posta"
                  value={patient.email}
                  field="email"
                  type="email"
                  onUpdate={() => {}}
                />
                <EditableField
                  label="Telefon"
                  value={patient.phone}
                  field="phone"
                  type="tel"
                  onUpdate={() => {}}
                />
              </div>
              
              <EditableField
                label="Adres"
                value={patient.address}
                field="address"
                type="text"
                onUpdate={() => {}}
              />
              
              <EditableField
                label="Referans"
                value={patient.reference}
                field="reference"
                type="text"
                onUpdate={() => {}}
              />
            </CardContent>
          </Card>

          {/* Patient Notes */}
          {patient.notes && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Hasta Notları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">{patient.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialist Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Uzman Ataması</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Atanan Uzman"
                value={patient.assignedToId || "none"}
                field="assignedToId"
                type="select"
                options={specialists?.map((s: any) => ({
                  value: s.id,
                  label: `${s.name} - ${s.specialist?.branch || "Genel"}`
                })) || []}
                onUpdate={() => {}}
              />
              
              {patient.specialist && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Uzmanlık Alanı</label>
                    <p>{patient.specialist.specialist?.branch || "Belirtilmemiş"}</p>
                  </div>
                  
                  <EditableField
                    label="Uzman Payı (%)"
                    value={patient.specialistShare || 50}
                    field="specialistShare"
                    type="text"
                    onUpdate={() => {}}
                  />
                </>
              )}
              
              {!patient.specialist && patient.assignedToId && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  Uzman bilgileri yükleniyor...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>İstatistikler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{patient.totalSessions}</p>
                  <p className="text-sm text-gray-600">Toplam Seans</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">₺{patient.totalPayments?.toFixed(2) || "0.00"}</p>
                  <p className="text-sm text-gray-600">Toplam Ödeme</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle>💳 Ödeme Kayıt</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentSection patientId={id} patientName={patient.name} hasSpecialist={!!patient.assignedToId} />
            </CardContent>
          </Card>

          {/* Patient Notes */}
          <PatientNotes patientId={id} />

          {/* Appointment History */}
          <AppointmentHistory patientId={id} />

          {/* Recent Activity */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Payment activities */}
                {payments && payments.length > 0 && payments.map((payment: any) => (
                  <div key={payment.id} className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💳</span>
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Ödeme alındı: ₺{payment.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-green-700">
                            Uzman payı: ₺{payment.specialistCut.toFixed(2)} • 
                            Klinik payı: ₺{payment.clinicCut.toFixed(2)}
                            {payment.specialist?.name && ` • ${payment.specialist.name}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Patient created */}
                <div className="p-3 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <p className="text-sm">Hasta kaydı oluşturuldu</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(patient.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>

                {/* Patient updated */}
                {patient.updatedAt !== patient.createdAt && (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✏️</span>
                        <p className="text-sm">Hasta bilgileri güncellendi</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(patient.updatedAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* No activities message */}
                {(!payments || payments.length === 0) && patient.updatedAt === patient.createdAt && (
                  <div className="p-4 text-center text-gray-400">
                    <p className="text-sm">Henüz aktivite bulunmuyor</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ToastProvider>
  );
}