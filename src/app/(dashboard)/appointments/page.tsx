"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import moment from "moment";
import "moment/locale/tr"; // Turkish locale
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
// import AddAppointmentModal from "@/components/ui/AddAppointmentModal";
// import StepAppointmentModal from "@/components/ui/StepAppointmentModal";

// Set Turkish locale for moment
moment.locale("tr");
const localizer = momentLocalizer(moment);

export default function AppointmentCalendar() {
  const { data: session } = useSession();
  const { show } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState<string>("");
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editNotes, setEditNotes] = useState<string>("");
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    patientId: "",
    specialistId: "",
    roomId: "",
    date: "", // full datetime when slot selected
    duration: 60,
    notes: "",
  });
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Uzmanlar için specialistId'yi otomatik ayarla
  useEffect(() => {
    if (session?.user?.role === "UZMAN" && session?.user?.id) {
      setForm(prev => ({ ...prev, specialistId: prev.specialistId || session.user.id }));
    }
  }, [session]);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Randevular yüklenemedi");
      return res.json();
    },
  });

  // Uzmanlar sadece kendi randevularını görebilir
  const filteredData = session?.user?.role === "UZMAN" 
    ? data?.filter((a: any) => a.specialistId === session.user.id) 
    : data;

  const events =
    filteredData?.map((a: any) => ({
      id: a.id,
      title: `${a.patient.name} • ${a.specialist.name}`,
      start: new Date(a.date),
      end: moment(a.date).add(a.duration, "minutes").toDate(),
      resource: a,
    })) || [];

  const DnDCalendar: any = withDragAndDrop(Calendar);

  const headerLabel =
    currentView === "day"
      ? moment(currentDate).format("DD MMMM YYYY")
      : currentView === "week"
      ? `${moment(currentDate).startOf("week").format("DD MMM")} - ${moment(currentDate).endOf("week").format("DD MMM YYYY")}`
      : currentView === "agenda"
      ? moment(currentDate).format("DD MMMM YYYY")
      : moment(currentDate).format("MMMM YYYY");

  // Custom event style function for appointment status colors
  const eventStyleGetter = (event: any) => {
    const now = new Date();
    const today = moment().startOf('day');
    const eventStart = moment(event.start);
    const eventDay = eventStart.clone().startOf('day');
    const status = event.resource.status;
    
    let className = '';
    
    // Color coding based on status
    if (status === 'CANCELED') {
      // Canceled appointments are yellow
      className = 'canceled-appointment';
      return {
        className,
        style: {
          backgroundColor: '#eab308',
          borderColor: '#ca8a04',
          color: 'white',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          fontSize: '12px',
          fontWeight: '500',
          padding: '2px 6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        } as React.CSSProperties,
      };
    }
    else if (status === 'COMPLETED') {
      // Completed appointments are green
      className = 'completed-appointment';
      return {
        className,
        style: {
          backgroundColor: '#22c55e',
          borderColor: '#16a34a',
          color: 'white',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          fontSize: '12px',
          fontWeight: '500',
          padding: '2px 6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        } as React.CSSProperties,
      };
    }
    // Past appointments that are still scheduled are red (busy)
    else if (eventStart.isBefore(now) && status === 'SCHEDULED') {
      className = 'past-appointment';
      return {
        className,
        style: {
          backgroundColor: '#dc2626',
          borderColor: '#b91c1c',
          color: 'white',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          fontSize: '12px',
          fontWeight: '500',
          padding: '2px 6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        } as React.CSSProperties,
      };
    }
    // Today's scheduled appointments are green
    else if (eventDay.isSame(today) && status === 'SCHEDULED') {
      className = 'today-appointment';
      return {
        className,
        style: {
          backgroundColor: '#22c55e',
          borderColor: '#16a34a',
          color: 'white',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          fontSize: '12px',
          fontWeight: '500',
          padding: '2px 6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        } as React.CSSProperties,
      };
    }
    // Future scheduled appointments are blue
    else {
      className = 'scheduled-appointment';
      return {
        className,
        style: {
          backgroundColor: '#2563eb',
          borderColor: '#1d4ed8',
          color: 'white',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          fontSize: '12px',
          fontWeight: '500',
          padding: '2px 6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        } as React.CSSProperties,
      };
    }
  };

  const canManageAppointments = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN" || session?.user?.role === "UZMAN";
  const canCreateAppointment = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN" || session?.user?.role === "UZMAN";

  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let timer: any;
    const roles = ["ADMIN", "ASISTAN", "UZMAN"];
    if (session?.user?.role && roles.includes(session.user.role)) {
      const tick = async () => {
        const now = new Date();
        const to = new Date(now.getTime() + 60 * 60000);
        const sp = new URLSearchParams({ from: now.toISOString(), to: to.toISOString() });
        const res = await fetch(`/api/appointments?${sp.toString()}`);
        if (!res.ok) return;
        const upcoming = await res.json();
        upcoming.forEach((a: any) => {
          if (!notifiedIds.has(a.id)) {
            const t = moment(a.date).format("DD.MM.YYYY HH:mm");
            const msg = `⏰ 1 saat sonra randevu: ${a.patient?.name || "Hasta"} • ${a.specialist?.name || "Uzman"} • ${t}`;
            show(msg, "info");
            setNotifiedIds(prev => new Set(prev).add(a.id));
          }
        });
      };
      tick();
      timer = setInterval(tick, 60000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session, notifiedIds, show]);

  // Handle appointment status update with React Query
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, newStatus }: { appointmentId: string, newStatus: string }) => {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        throw new Error('Randevu durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      alert(error.message || 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    },
  });

  // Handle appointment status update
  const updateAppointmentStatus = (appointmentId: string, newStatus: string) => {
    updateStatusMutation.mutate({ appointmentId, newStatus });
  };

  const editMutation = useMutation({
    mutationFn: async ({ appointmentId, date, duration, notes }: { appointmentId: string; date?: string; duration?: number; notes?: string }) => {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, duration, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.message || "Randevu güncellenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      alert(error.message || "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    },
  });

  // Dropdown verileri
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Hastalar yüklenemedi");
      return res.json();
    },
  });

  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Uzmanlar yüklenemedi");
      return res.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", selectedDate, selectedTime, form.duration],
    queryFn: async () => {
      const dateParam = selectedDate ? `${selectedDate}T${selectedTime || "00:00"}` : "";
      const qs = selectedDate ? `?date=${encodeURIComponent(dateParam)}&duration=${form.duration}` : "";
      const res = await fetch(`/api/rooms${qs}`);
      if (!res.ok) throw new Error("Odalar yüklenemedi");
      return res.json();
    },
  });

  const { data: availability = [], refetch: refetchAvailability } = useQuery<any[]>({
    queryKey: ["availability", form.specialistId, selectedDate, form.duration],
    queryFn: async () => {
      if (!form.specialistId || !selectedDate) return [] as any[];
      const sp = new URLSearchParams({ specialistId: form.specialistId, date: selectedDate, duration: String(form.duration) });
      const res = await fetch(`/api/availability?${sp.toString()}`);
      if (!res.ok) throw new Error("Uygunluk yüklenemedi");
      return res.json();
    },
    enabled: !!form.specialistId && !!selectedDate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.message || "Randevu oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      setForm({ patientId: "", specialistId: session?.user?.role === "UZMAN" ? (session.user.id || "") : "", roomId: "", date: "", duration: 60, notes: "" });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowCreate(false);
    },
    onError: (error: any) => {
      alert(error.message || "Bir hata oluştu");
    },
  });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.specialistId || !form.roomId || !form.date) {
      alert("Hasta, uzman, oda ve tarih alanları zorunludur");
      return;
    }
    createMutation.mutate();
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = moment(currentDate);
    if (currentView === "month") setCurrentDate(d.subtract(1, "month").toDate());
    else if (currentView === "week") setCurrentDate(d.subtract(1, "week").toDate());
    else if (currentView === "day") setCurrentDate(d.subtract(1, "day").toDate());
    else setCurrentDate(d.subtract(1, "week").toDate());
  };
  const goNext = () => {
    const d = moment(currentDate);
    if (currentView === "month") setCurrentDate(d.add(1, "month").toDate());
    else if (currentView === "week") setCurrentDate(d.add(1, "week").toDate());
    else if (currentView === "day") setCurrentDate(d.add(1, "day").toDate());
    else setCurrentDate(d.add(1, "week").toDate());
  };

  const onEventDrop = ({ event, start, end }: any) => {
    const duration = moment(end).diff(moment(start), "minutes");
    editMutation.mutate({ appointmentId: event.resource.id, date: new Date(start).toISOString(), duration });
  };
  const onEventResize = ({ event, start, end }: any) => {
    const duration = moment(end).diff(moment(start), "minutes");
    editMutation.mutate({ appointmentId: event.resource.id, date: new Date(start).toISOString(), duration });
  };

  return (
    <ToastProvider>
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={goPrev}>Önceki</Button>
            <Button size="sm" variant="outline" onClick={goToday}>Bugün</Button>
            <Button size="sm" variant="outline" onClick={goNext}>Sonraki</Button>
          </div>
          <div className="text-sm font-semibold">
            {headerLabel}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={currentView === "month" ? "default" : "outline"} onClick={() => setCurrentView("month")}>Ay</Button>
            <Button size="sm" variant={currentView === "week" ? "default" : "outline"} onClick={() => setCurrentView("week")}>Hafta</Button>
            <Button size="sm" variant={currentView === "day" ? "default" : "outline"} onClick={() => setCurrentView("day")}>Gün</Button>
            <Button size="sm" variant={currentView === "agenda" ? "default" : "outline"} onClick={() => setCurrentView("agenda")}>Liste</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-1">
              <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                <Button className="w-full" onClick={() => setShowCreate(true)}>+ Yeni Randevu</Button>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span><span>Yeni Etkinlik Planlama</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span>Toplantı</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span>Raporlama</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><span>Yeni Tema</span></div>
                </div>
              </div>
            </div>
            <div className="md:col-span-4">
          {canCreateAppointment && showCreate && (
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Hasta</h3>
                </CardHeader>
                <CardContent>
                  <Select value={form.patientId} onValueChange={(value) => {
                    setForm({ ...form, patientId: value });
                    const p = patients.find((pt: any) => pt.id === value);
                    if (p?.assignedToId && (!form.specialistId || form.specialistId !== p.assignedToId)) {
                      setForm(prev => ({ ...prev, specialistId: p.assignedToId }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hasta seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Uzman</h3>
                </CardHeader>
                <CardContent>
                  {session?.user?.role !== "UZMAN" ? (
                    <div className="mb-3">
                      <label className="text-sm">Uzman</label>
                      <Select value={form.specialistId} onValueChange={(value) => setForm({ ...form, specialistId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Uzman seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialists.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}{s.specialist?.branch ? ` (${s.specialist.branch})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mb-2">Kendi randevunuzu oluşturuyorsunuz</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Tarih ve Detaylar</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm">Tarih</label>
                      <Input type="date" value={selectedDate} onChange={(e) => {
                        const d = e.target.value;
                        setSelectedDate(d);
                        setSelectedTime("");
                        setForm(prev => ({ ...prev, date: "" }));
                        if (form.specialistId && d) refetchAvailability();
                      }} />
                    </div>
                    {selectedDate && form.specialistId && (
                      <div>
                        <label className="text-sm">Saat</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {availability.map((slot: any) => {
                            const isBusy = slot.status === "busy";
                            const isSelected = selectedTime === slot.time;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setSelectedTime(slot.time);
                                  setForm(prev => ({ ...prev, date: `${selectedDate}T${slot.time}` }));
                                }}
                                className={`p-2 rounded text-sm border transition ${
                                  isBusy ? "bg-red-100 text-red-600 border-red-300 cursor-not-allowed" :
                                  isSelected ? "bg-blue-500 text-white border-blue-600" : "bg-gray-100 border-gray-300 hover:bg-blue-100"
                                }`}
                              >
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedDate && (
                      <div>
                        <label className="text-sm">Oda</label>
                        <Select value={form.roomId} onValueChange={(value) => setForm({ ...form, roomId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Oda seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.map((room: any) => (
                              <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm">Süre (dk)</label>
                      <Input type="number" min={15} max={240} step={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-sm">Notlar</label>
                      <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={submitCreate} disabled={!form.patientId || !form.specialistId || !form.roomId || !form.date || createMutation.isPending}>
                        {createMutation.isPending ? "Oluşturuluyor..." : "Randevu Oluştur"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500">Yükleniyor...</p>
            </div>
          ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">İptal Edilmiş</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">Tamamlanmış/Bugünkü</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">Planlanmış</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">Geçmiş</span>
              </div>
            </div>
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectEvent={(event: any) => setSelectedEvent(event)}
              view={currentView}
              date={currentDate}
              onView={(view: View) => {
                console.log("View changed to:", view);
                setCurrentView(view);
              }}
              onNavigate={(date: Date, view?: View) => {
                console.log("Date navigated to:", date, "View:", view);
                setCurrentDate(date);
                if (view) setCurrentView(view);
              }}
              views={["month", "week", "day", "agenda"]}
              defaultView={"month"}
              toolbar={false}
              min={moment("08:00", "HH:mm").toDate()}
              max={moment("19:00", "HH:mm").toDate()}
              step={60}
              timeslots={1}
              eventPropGetter={eventStyleGetter}
              showMultiDayTimes
              popup
              selectable
              onSelectSlot={(slotInfo: any) => {
                const d = moment(slotInfo.start).format("YYYY-MM-DD");
                setSelectedDate(d);
                setShowCreate(true);
                setSelectedTime("");
                setForm(prev => ({ ...prev, date: "" }));
                if (form.specialistId) refetchAvailability();
              }}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              culture="tr"
              messages={{
                next: "Sonraki",
                previous: "Önceki",
                today: "Bugün",
                month: "Ay",
                week: "Hafta",
                day: "Gün",
                agenda: "Liste",
                date: "Tarih",
                time: "Saat",
                event: "Randevu",
                noEventsInRange: "Bu tarih aralığında randevu yok",
                showMore: (total: number) => `+${total} daha`,
                allDay: "Tüm Gün",
                work_week: "İş Haftası",
                yesterday: "Dün",
                tomorrow: "Yarın",
              }}
              formats={{
                timeGutterFormat: "HH:00",
                eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
                dayFormat: "DD MMM",
                weekdayFormat: "dddd",
                monthHeaderFormat: "MMMM YYYY",
                dayHeaderFormat: "dddd, DD MMMM YYYY",
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("DD MMM")} - ${moment(end).format("DD MMM YYYY")}`,
                selectRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("HH:00")} - ${moment(end).format("HH:00")}`,
                agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("DD MMM")} - ${moment(end).format("DD MMM YYYY")}`,
                agendaDateFormat: "DD MMM",
                agendaTimeFormat: "HH:mm",
                agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
              }}
            />
          </>
          )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Randevu Detayları</h3>
            <div className="space-y-2">
              <p className="text-gray-900 dark:text-gray-100"><strong>Hasta:</strong> {selectedEvent.resource.patient.name}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Uzman:</strong> {selectedEvent.resource.specialist.name}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Tarih:</strong> {moment(selectedEvent.start).format("DD.MM.YYYY HH:mm")}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Süre:</strong> {selectedEvent.resource.duration} dakika</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Durum:</strong> {
                selectedEvent.resource.status === "SCHEDULED" ? "Planlandı" :
                selectedEvent.resource.status === "COMPLETED" ? "Tamamlandı" :
                selectedEvent.resource.status === "CANCELED" ? "İptal Edildi" : 
                selectedEvent.resource.status
              }</p>
              {selectedEvent.resource.notes && (
                <p className="text-gray-900 dark:text-gray-100"><strong>Notlar:</strong> {selectedEvent.resource.notes}</p>
              )}
            </div>
            {isEditing && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-300">Tarih/Saat</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-300">Süre (dk)</label>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Notlar</label>
                  <textarea
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <div className="flex space-x-2">
                {canManageAppointments && selectedEvent.resource.status === 'SCHEDULED' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updateAppointmentStatus(selectedEvent.resource.id, 'COMPLETED')}
                      disabled={moment(selectedEvent.start).isAfter(moment())}
                      className="border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✅ Tamamla
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updateAppointmentStatus(selectedEvent.resource.id, 'CANCELED')}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      ❌ İptal Et
                    </Button>
                  </>
                )}
                {canManageAppointments && selectedEvent.resource.status === 'CANCELED' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => updateAppointmentStatus(selectedEvent.resource.id, 'SCHEDULED')}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    🔄 Yeniden Planla
                  </Button>
                )}
                {canCreateAppointment && (
                  !isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      onClick={() => {
                        setIsEditing(true);
                        setEditStart(moment(selectedEvent.start).format('YYYY-MM-DDTHH:mm'));
                        setEditDuration(selectedEvent.resource.duration);
                        setEditNotes(selectedEvent.resource.notes || "");
                      }}
                    >
                      Düzenle
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => editMutation.mutate({ appointmentId: selectedEvent.resource.id, date: editStart ? new Date(editStart).toISOString() : undefined, duration: editDuration, notes: editNotes })}
                      >
                        Kaydet
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        onClick={() => setIsEditing(false)}
                      >
                        İptal
                      </Button>
                    </>
                  )
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedEvent(null)}
                className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals kaldırıldı; inline kart formu kullanılıyor */}
    </div>
    </ToastProvider>
  );
}
