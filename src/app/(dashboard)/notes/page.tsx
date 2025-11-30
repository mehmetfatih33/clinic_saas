"use client";
import { useQuery } from "@tanstack/react-query";
import NoteModal from "@/components/ui/NoteModal";
import { ToastProvider } from "@/components/ui/ToastProvider";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    name: string;
    role: string;
  };
  patient?: { id: string; name: string };
  appointment?: { id: string; date: string };
}

export default function NotesPage() {
  const { data, refetch, isLoading } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      return res.json();
    },
  });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Notlar</h1>
          <NoteModal onAdded={refetch} />
        </div>

        {isLoading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3">Hasta</th>
                  <th className="text-left p-3">Not</th>
                  <th className="p-3 text-center">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((n: Note) => (
                  <tr key={n.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-sky-50/40 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-700 dark:text-gray-200">{n.patient?.name || "-"}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{n.content}</td>
                    <td className="p-3 text-center text-gray-500 text-xs">{new Date(n.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
