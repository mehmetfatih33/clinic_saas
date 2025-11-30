"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type Assessment = {
  id: string;
  patientId: string;
  specialistId: string;
  type: "PHQ9" | "GAD7";
  answers: number[];
  total: number;
  createdAt: string;
};

export default function PatientAssessmentsPage() {
  const params = useParams();
  const patientId = params?.id as string;
  const qc = useQueryClient();
  const [type, setType] = useState<"PHQ9" | "GAD7">("PHQ9");
  const itemCount = type === "PHQ9" ? 9 : 7;
  const [answers, setAnswers] = useState<number[]>(Array(itemCount).fill(0));

  const { data, isLoading } = useQuery<Assessment[]>({
    queryKey: ["assessments", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/assessments`);
      return res.json();
    },
    enabled: !!patientId,
  });

  const mutate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, answers }),
      });
      if (!res.ok) throw new Error("Kaydetme başarısız");
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assessments", patientId] });
      setAnswers(Array(itemCount).fill(0));
    },
  });

  const total = answers.reduce((a, b) => a + Number(b || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Değerlendirmeler</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Select value={type} onValueChange={(v) => {
              const t = v as "PHQ9" | "GAD7";
              setType(t);
              const n = t === "PHQ9" ? 9 : 7;
              setAnswers(Array(n).fill(0));
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHQ9">PHQ-9</SelectItem>
                <SelectItem value="GAD7">GAD-7</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">Toplam: {total}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {answers.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="text-sm w-10">S{idx + 1}</div>
                <Select value={String(val)} onValueChange={(v) => {
                  const next = [...answers];
                  next[idx] = Number(v);
                  setAnswers(next);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-medium">Son Değerlendirmeler</h3>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Tür</th>
                    <th className="text-left p-2">Toplam</th>
                    <th className="text-left p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{a.type}</td>
                      <td className="p-2">{a.total}</td>
                      <td className="p-2">{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
