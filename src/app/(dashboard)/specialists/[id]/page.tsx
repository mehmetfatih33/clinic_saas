"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/ToastProvider";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Patient {
  id: string;
  name: string;
  fee?: number;
  totalPayments?: number;
  totalSessions?: number;
  createdAt: string;
}

interface SpecialistData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  specialist: {
    branch: string;
    defaultShare: number;
    hourlyFee: number;
    bio: string;
    totalPatients: number;
    totalRevenue: number;
    avgRevenue: number;
  };
  patients: Patient[];
}

export default function SpecialistDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading } = useQuery<SpecialistData>({
    queryKey: ["specialist", id],
    queryFn: async () => {
      const res = await fetch(`/api/specialists/${id}`);
      if (!res.ok) throw new Error("Uzman bilgileri alınamadı");
      return res.json();
    },
  });

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const { data: accruals = [] } = useQuery<any[]>({
    queryKey: ["accruals", id, filterMonth, filterYear],
    queryFn: async () => {
      const sp = new URLSearchParams({ specialistId: id });
      if (filterMonth) sp.set("month", filterMonth);
      if (filterYear) sp.set("year", filterYear);
      const res = await fetch(`/api/finance/accruals?${sp.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return <p className="p-6 text-gray-500">Yüklüyor...</p>;
  if (!data) return <p className="p-6 text-red-500">Veri bulunamadı.</p>;

  const revenueChartData = data.patients.map((p) => ({
    name: p.name,
    revenue: p.totalPayments || 0,
  }));


  return (
    <ToastProvider>
      <div className="space-y-6 p-6">
      {/* Uzman Başlık Kartı */}
      <HeaderCard id={id} data={data} />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Hakediş Özeti</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600">Ay</label>
              <Input type="number" min="1" max="12" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Yıl</label>
              <Input type="number" min="2000" max="2100" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
            </div>
          </div>
          <div>
            {Array.isArray(accruals) && accruals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const me = accruals.find((a: any) => a.specialistId === id);
                  const acc = me?.accrued || 0;
                  const paid = me?.paidOut || 0;
                  const bal = me?.balance || 0;
                  return (
                    <>
                      <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Hakediş</p><p className="text-2xl font-semibold text-blue-700">{acc.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
                      <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Ödenen</p><p className="text-2xl font-semibold text-green-700">{paid.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
                      <Card className="bg-yellow-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Bakiye</p><p className="text-2xl font-semibold text-yellow-700">{bal.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gray-500">Veri yok</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performans Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Toplam Gelir</p>
            <p className="text-2xl font-semibold text-green-700">
              {data.specialist.totalRevenue.toLocaleString("tr-TR")} ₺
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Ortalama Hasta Geliri</p>
            <p className="text-2xl font-semibold text-blue-700">
              {data.specialist.avgRevenue.toLocaleString("tr-TR")} ₺
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Hasta Sayısı</p>
            <p className="text-2xl font-semibold text-yellow-700">
              {data.specialist.totalPatients}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gelir Grafiği */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Hasta Bazlı Gelir Grafiği</h2>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tatil Günleri Yönetimi */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Tatil Günleri</h2>
        </CardHeader>
        <CardContent>
          <TatilGunleri specialistId={id} />
        </CardContent>
      </Card>

      {/* Hasta Tablosu */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Hasta Detayları</h2>
        </CardHeader>
        <CardContent>
          {data.patients.length === 0 ? (
            <p className="text-gray-500">Bu uzmana atanmış hasta bulunmuyor.</p>
          ) : (
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Hasta</th>
                  <th className="text-left px-4 py-2">Seans</th>
                  <th className="text-left px-4 py-2">Ücret</th>
                  <th className="text-left px-4 py-2">Ödeme</th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2">{p.totalSessions ?? 0}</td>
                    <td className="px-4 py-2">{p.fee?.toLocaleString("tr-TR") ?? "-"} ₺</td>
                    <td className="px-4 py-2 text-green-700 font-medium">
                      {p.totalPayments?.toLocaleString("tr-TR") ?? 0} ₺
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="pt-6">
        <Link href="/specialists">
          <Button variant="outline">← Uzman Listesine Dön</Button>
        </Link>
      </div>
      </div>
    </ToastProvider>
  );
}

function TatilGunleri({ specialistId }: { specialistId: string }) {
  const qc = useQueryClient();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const { show: showToast } = useToast();
  const fmt = (v: string) => new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));

  const { data: timeoffs = [] } = useQuery<any[]>({
    queryKey: ["timeoff", specialistId],
    queryFn: async () => {
      const res = await fetch(`/api/specialists/${specialistId}/timeoff`, { credentials: "include" });
      if (!res.ok) throw new Error("Tatil günleri yüklenemedi");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/specialists/${specialistId}/timeoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ start, end: end || undefined, reason }),
      });
      if (!res.ok) {
        let msg = "Ekleme başarısız";
        try { const err = await res.json(); msg = err?.message || msg; } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: async () => {
      setStart(""); setEnd(""); setReason("");
      await qc.invalidateQueries({ queryKey: ["timeoff", specialistId] });
      showToast("Tatil günü eklendi", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Ekleme başarısız", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/specialists/${specialistId}/timeoff`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timeoffId: id }),
      });
      if (!res.ok) {
        let msg = "Silme başarısız";
        try { const err = await res.json(); msg = err?.message || msg; } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["timeoff", specialistId] });
      showToast("Tatil günü silindi", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Silme başarısız", "error");
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Başlangıç</label>
          <Input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Bitiş (opsiyonel)</label>
          <Input type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Sebep</label>
          <Input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Örn. Yıllık izin" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={()=>addMutation.mutate()} disabled={!start || addMutation.isPending}>
          {addMutation.isPending?"Ekleniyor...":"Ekle"}
        </Button>
      </div>

      <div className="border-t pt-4">
        {timeoffs.length === 0 ? (
          <p className="text-sm text-gray-500">Kayıtlı tatil günü yok</p>
        ) : (
          <ul className="space-y-2">
            {timeoffs.map((t: any) => (
              <li key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">Başlangıç</span>
                  <span className="font-medium text-gray-900">{fmt(t.start)}</span>
                  {t.end && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700">Bitiş</span>
                      <span className="font-medium text-gray-900">{fmt(t.end)}</span>
                    </>
                  )}
                  {t.reason && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{t.reason}</span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={()=>deleteMutation.mutate(t.id)}>Sil</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
function HeaderCard({ id, data }: { id: string; data: SpecialistData }) {
  const qc = useQueryClient();
  const { show } = useToast();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || "",
    defaultShare: data.specialist.defaultShare,
    hourlyFee: data.specialist.hourlyFee,
  });

  const patch = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/specialists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address || null,
          defaultShare: form.defaultShare,
          hourlyFee: form.hourlyFee,
        }),
      });
      if (!res.ok) {
        let msg = "Güncelleme başarısız";
        try { const err = await res.json(); msg = err?.message || msg; } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["specialist", id] });
      show("Uzman bilgileri güncellendi ✅", "success");
      setEdit(false);
    },
    onError: (err: any) => {
      show(err?.message || "Güncelleme başarısız ❌", "error");
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-gray-600">{data.email}</p>
            {data.phone && <p className="text-gray-600">{data.phone}</p>}
            {data.address && <p className="text-gray-600">{data.address}</p>}
          </div>
          <div>
            <Button variant="outline" onClick={() => setEdit((e) => !e)}>
              {edit ? "İptal" : "Düzenle"}
            </Button>
            <Link href={`/specialists/${id}/notes`} className="ml-2">
              <Button>Notlar</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {edit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Ad Soyad</label>
              <Input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">E‑posta</label>
              <Input type="email" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">Telefon</label>
              <Input value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">Adres</label>
              <Input value={form.address ?? ""} onChange={(e)=>setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">Varsayılan Pay</label>
              <Input type="number" min="0" max="100" value={form.defaultShare} onChange={(e)=>setForm({ ...form, defaultShare: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">Saatlik Ücret</label>
              <Input type="number" min="0" step="50" value={form.hourlyFee} onChange={(e)=>setForm({ ...form, hourlyFee: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setEdit(false)}>İptal</Button>
              <Button onClick={()=>patch.mutate()} disabled={patch.isPending}>
                {patch.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Branş</p>
              <p className="font-medium">{data.specialist.branch}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Varsayılan Pay</p>
              <p className="font-medium">{data.specialist.defaultShare}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Saatlik Ücret</p>
              <p className="font-medium">{data.specialist.hourlyFee} ₺</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Hasta</p>
              <p className="font-medium">{data.specialist.totalPatients}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
