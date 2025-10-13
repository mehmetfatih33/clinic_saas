"use client";
import { useQuery } from "@tanstack/react-query";
import AddAssignmentModal from "@/components/ui/AddAssignmentModal";
import { ToastProvider } from "@/components/ui/ToastProvider";

interface Assignment {
  id: string;
  patientId: string;
  specialistId: string;
  feeScheduleId: string;
  splitClinic: number;
  splitDoctor: number;
  isActive: boolean;
  createdAt: string;
  patient?: {
    id: string;
    name: string;
  };
  specialist?: {
    id: string;
    name: string;
  };
  feeSchedule?: {
    id: string;
    title: string;
    amount: number;
  };
}

export default function AssignmentsPage() {
  const { data, refetch, isLoading } = useQuery<Assignment[]>({
    queryKey: ["assignments"],
    queryFn: async () => {
      const res = await fetch("/api/assignments");
      return res.json();
    },
  });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Atamalar</h1>
          <AddAssignmentModal onAdded={refetch} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Toplam Atama</h3>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data?.length || 0}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Aktif Atama</h3>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {data?.filter(a => a.isActive).length || 0}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Ortalama Klinik Payı</h3>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {data && data.length > 0 
                ? Math.round(data.reduce((sum, a) => sum + a.splitClinic, 0) / data.length)
                : 0}%
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3">Hasta</th>
                  <th className="text-left p-3">Uzman</th>
                  <th className="text-left p-3">Ücret Tarifesi</th>
                  <th className="text-center p-3">Klinik Payı</th>
                  <th className="text-center p-3">Uzman Payı</th>
                  <th className="text-center p-3">Durum</th>
                  <th className="text-center p-3">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((assignment: Assignment) => (
                  <tr key={assignment.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-sky-50/40 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-700 dark:text-gray-200 font-medium">
                      {assignment.patient?.name || "N/A"}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {assignment.specialist?.name || "N/A"}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      <div>
                        <div className="font-medium">{assignment.feeSchedule?.title || "N/A"}</div>
                        <div className="text-xs text-gray-500">₺{(assignment.feeSchedule?.amount || 0) / 100}</div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {assignment.splitClinic}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-xs">
                        {assignment.splitDoctor}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        assignment.isActive 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200"
                      }`}>
                        {assignment.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500 text-xs">
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            Henüz atama oluşturulmamış. İlk atamayı oluşturmak için "+ Yeni Atama" butonunu kullanın.
          </div>
        )}
      </div>
    </ToastProvider>
  );
}