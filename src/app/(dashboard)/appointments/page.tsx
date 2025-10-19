"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/tr"; // Turkish locale
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { useSession } from "next-auth/react";
import AddAppointmentModal from "@/components/ui/AddAppointmentModal";
import StepAppointmentModal from "@/components/ui/StepAppointmentModal";

// Set Turkish locale for moment
moment.locale("tr");
const localizer = momentLocalizer(moment);

export default function AppointmentCalendar() {
  const { data: session } = useSession();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();

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
          backgroundColor: '#eab308', // yellow-500
          borderColor: '#ca8a04', // yellow-600
          color: 'white',
          borderRadius: '6px',
          border: '2px solid',
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
          backgroundColor: '#22c55e', // green-500
          borderColor: '#16a34a', // green-600
          color: 'white',
          borderRadius: '6px',
          border: '2px solid',
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
          backgroundColor: '#dc2626', // red-600
          borderColor: '#b91c1c', // red-700
          color: 'white',
          borderRadius: '6px',
          border: '2px solid',
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
          backgroundColor: '#22c55e', // green-500
          borderColor: '#16a34a', // green-600
          color: 'white',
          borderRadius: '6px',
          border: '2px solid',
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
          backgroundColor: '#2563eb', // blue-600
          borderColor: '#1d4ed8', // blue-700
          color: 'white',
          borderRadius: '6px',
          border: '2px solid',
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">🗓️ Randevu Takvimi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Görünüm: {currentView === "month" ? "Aylık" : currentView === "week" ? "Haftalık" : "Günlük"} •{" "}
              {moment(currentDate).format("MMMM YYYY")}
            </p>
          </div>
          {canCreateAppointment && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                Hızlı Randevu
              </Button>
              <Button onClick={() => setShowStepModal(true)}>+ Aşamalı Randevu</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
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
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectEvent={(event) => setSelectedEvent(event)}
              view={currentView}
              date={currentDate}
              onView={(view) => {
                console.log("View changed to:", view);
                setCurrentView(view);
              }}
              onNavigate={(date, view) => {
                console.log("Date navigated to:", date, "View:", view);
                setCurrentDate(date);
                if (view) setCurrentView(view);
              }}
              views={["month", "week", "day"]}
              defaultView={"month"}
              min={moment("08:00", "HH:mm").toDate()}
              max={moment("19:00", "HH:mm").toDate()}
              step={60}
              timeslots={1}
              eventPropGetter={eventStyleGetter}
              showMultiDayTimes
              popup
              selectable
              culture="tr"
              messages={{
                next: "Sonraki",
                previous: "Önceki",
                today: "Bugün",
                month: "Ay",
                week: "Hafta",
                day: "Gün",
                agenda: "Ajanda",
                date: "Tarih",
                time: "Saat",
                event: "Randevu",
                noEventsInRange: "Bu tarih aralığında randevu yok",
                showMore: (total) => `+${total} daha`,
                allDay: "Tüm Gün",
                work_week: "İş Haftası",
                yesterday: "Dün",
                tomorrow: "Yarın",
              }}
              formats={{
                timeGutterFormat: "HH:00",
                eventTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
                dayFormat: "DD MMM",
                weekdayFormat: "dddd",
                monthHeaderFormat: "MMMM YYYY",
                dayHeaderFormat: "dddd, DD MMMM YYYY",
                dayRangeHeaderFormat: ({ start, end }) =>
                  `${moment(start).format("DD MMM")} - ${moment(end).format("DD MMM YYYY")}`,
                selectRangeFormat: ({ start, end }) =>
                  `${moment(start).format("HH:00")} - ${moment(end).format("HH:00")}`,
                agendaHeaderFormat: ({ start, end }) =>
                  `${moment(start).format("DD MMM")} - ${moment(end).format("DD MMM YYYY")}`,
                agendaDateFormat: "DD MMM",
                agendaTimeFormat: "HH:mm",
                agendaTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
              }}
            />
          </>
          )}
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
            <div className="flex justify-between mt-6">
              <div className="flex space-x-2">
                {canManageAppointments && selectedEvent.resource.status === 'SCHEDULED' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updateAppointmentStatus(selectedEvent.resource.id, 'COMPLETED')}
                      className="border-green-300 text-green-700 hover:bg-green-50"
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
                  <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    Düzenle
                  </Button>
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

      {/* Add Appointment Modals */}
      <AddAppointmentModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
      
      <StepAppointmentModal 
        open={showStepModal} 
        onClose={() => setShowStepModal(false)} 
      />
    </div>
  );
}