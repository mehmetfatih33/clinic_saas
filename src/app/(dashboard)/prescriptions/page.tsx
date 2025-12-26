"use client";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, Pill, Calendar, User } from "lucide-react";
import { useState } from "react";
import AddPrescriptionModal from "@/components/ui/AddPrescriptionModal";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function PrescriptionsPage() {
  return (
    <ToastProvider>
      <PrescriptionsContent />
    </ToastProvider>
  );
}

function PrescriptionsContent() {
  const [search, setSearch] = useState("");

  const { data: prescriptions = [], refetch } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const res = await fetch("/api/prescriptions");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  const filteredPrescriptions = prescriptions.filter((p: any) => 
    p.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.items?.some((i: any) => i.medication.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reçeteler</h1>
          <p className="text-muted-foreground">Hasta reçetelerini yönetin ve görüntüleyin.</p>
        </div>
        <AddPrescriptionModal onAdded={refetch} />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Hasta adı veya ilaç ara..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredPrescriptions.length === 0 ? (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Henüz reçete yok</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            Oluşturulan reçeteler burada listelenecektir. Yeni bir reçete oluşturmak için yukarıdaki butonu kullanın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrescriptions.map((prescription: any) => (
            <div key={prescription.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{prescription.patient?.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(prescription.createdAt), "d MMMM yyyy", { locale: tr })}
                    </p>
                  </div>
                </div>
              </div>

              {prescription.diagnosis && (
                 <div className="mb-4 text-sm bg-gray-50 p-2 rounded text-gray-700">
                    <span className="font-medium">Tanı:</span> {prescription.diagnosis}
                 </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Pill size={12} /> İlaçlar
                </h4>
                <div className="space-y-2">
                  {prescription.items?.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="font-medium text-gray-800">{item.medication}</div>
                      <div className="text-xs text-gray-500">
                        {item.dosage} • {item.frequency}
                      </div>
                    </div>
                  ))}
                  {prescription.items?.length > 3 && (
                    <div className="text-xs text-center text-blue-600 font-medium pt-1">
                      + {prescription.items.length - 3} ilaç daha
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
