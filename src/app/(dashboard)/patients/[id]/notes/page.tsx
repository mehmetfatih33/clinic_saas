"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientNotesPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["patient-notes", id],
    queryFn: async () => {
      const res = await fetch(`/api/notes?patientId=${id}`);
      if (!res.ok) throw new Error("Notlar yüklenemedi");
      return res.json();
    },
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hasta Notları</h1>
        <Link href={`/patients/${id}/notes/new`}>
          <Button>Yeni Not</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="grid gap-4">
          {notes.length === 0 ? (
            <p className="text-gray-500">Henüz not yok</p>
          ) : (
            notes.map((n: any) => (
              <Card key={n.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span>{new Date(n.createdAt).toLocaleString("tr-TR")}</span>
                      {n.author?.name && (
                        <span className="ml-2">Yazan: {n.author.name}</span>
                      )}
                      {n.appointment?.date && (
                        <span className="ml-2">Seans Tarihi: {new Date(n.appointment.date).toLocaleString("tr-TR")}</span>
                      )}
                    </div>
                    <div>
                      <span className="px-2 py-1 text-xs rounded bg-gray-100">
                        {n.visibility === "PRIVATE" ? "Gizli" : "İç"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-100">{n.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
