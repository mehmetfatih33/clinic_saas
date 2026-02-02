"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description?: string;
  date: string;
  patient?: { id: string; name: string } | null;
  specialist?: { id: string; name: string } | null;
};

function PaymentsTab() {
  type Payment = {
    id: string;
    amount: number;
    specialistCut: number;
    clinicCut: number;
    createdAt: string;
    patient: { name: string };
    specialist: { name: string };
  };
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery<{ items: Payment[] } | { items: any[] } | any>({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments/list");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message || json.error || `Sunucu hatası: ${res.status}`);
      }

      if (json.ok === false) {
        throw new Error(json.message || json.error || "Veri alınamadı");
      }

      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return { items };
    },
  });
  if (isLoading) return <p className="p-6 text-gray-500">Yükleniyor...</p>;
  if (error) return (
    <div className="p-6 bg-red-50 text-red-600 rounded-lg">
      <p className="font-semibold">Ödemeler yüklenemedi</p>
      <p className="text-sm mt-1">Detay: {(error as Error).message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Sayfayı Yenile</Button>
    </div>
  );
  const list: Payment[] = Array.isArray(data?.items) ? (data.items as Payment[]) : [];
  const filtered: Payment[] = list.filter((p: Payment) =>
    (p.patient?.name?.toLowerCase().includes(search.toLowerCase()) || false) ||
    (p.specialist?.name?.toLowerCase().includes(search.toLowerCase()) || false)
  );
  const totalAmount = filtered.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const totalSpecialistCut = filtered.reduce((sum: number, p: Payment) => sum + p.specialistCut, 0);
  const totalClinicCut = filtered.reduce((sum: number, p: Payment) => sum + p.clinicCut, 0);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Ödemeler</h2>
        </CardHeader>
        <CardContent>
          <Input placeholder="Hasta veya uzman ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Toplam Ödeme</p><p className="text-2xl font-semibold text-green-700">{totalAmount.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
            <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Uzman Payları</p><p className="text-2xl font-semibold text-blue-700">{totalSpecialistCut.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
            <Card className="bg-purple-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Klinik Payları</p><p className="text-2xl font-semibold text-purple-700">{totalClinicCut.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Tarih</th>
                  <th className="text-left px-4 py-2">Hasta</th>
                  <th className="text-left px-4 py-2">Uzman</th>
                  <th className="text-left px-4 py-2">Tutar</th>
                  <th className="text-left px-4 py-2">Uzman Payı</th>
                  <th className="text-left px-4 py-2">Klinik Payı</th>
                  <th className="text-left px-4 py-2">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">{search ? "Arama sonucu bulunamadı" : "Henüz ödeme kaydı yok"}</td></tr>
                ) : (
                  filtered.map((p: Payment) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2">{p.patient?.name || "-"}</td>
                      <td className="px-4 py-2">{p.specialist?.name || "-"}</td>
                      <td className="px-4 py-2 text-green-700 font-medium">{p.amount.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-4 py-2">{p.specialistCut.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-4 py-2">{p.clinicCut.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-4 py-2">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccrualsTab() {
  const { data: accruals = [], isLoading, error } = useQuery({
    queryKey: ["accruals"],
    queryFn: async () => {
      const res = await fetch("/api/finance/accruals");
      if (!res.ok) throw new Error("Hakediş verileri yüklenemedi");
      return res.json();
    },
  });

  if (isLoading) return <p className="p-6 text-gray-500">Yükleniyor...</p>;
  if (error) return <p className="p-6 text-red-600">Veriler yüklenemedi.</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Hakediş Durumu</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2">Uzman</th>
                <th className="text-left px-4 py-2">Toplam Hakediş</th>
                <th className="text-left px-4 py-2">Ödenen</th>
                <th className="text-left px-4 py-2">Bakiye (Ödenecek)</th>
              </tr>
            </thead>
            <tbody>
              {accruals.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Veri yok</td></tr>
              ) : (
                accruals.map((item: any) => (
                  <tr key={item.specialistId} className="border-t">
                    <td className="px-4 py-2 font-medium">{item.specialistName}</td>
                    <td className="px-4 py-2 text-blue-700 font-medium">{item.accrued.toLocaleString("tr-TR")} ₺</td>
                    <td className="px-4 py-2 text-green-700 font-medium">{item.paidOut.toLocaleString("tr-TR")} ₺</td>
                    <td className="px-4 py-2 text-red-700 font-bold">{item.balance.toLocaleString("tr-TR")} ₺</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  return (
    <ToastProvider>
      <FinanceContent />
    </ToastProvider>
  );
}

function FinanceContent() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isUzman = role === "UZMAN";
  const qc = useQueryClient();
  const { show } = useToast();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState("");
  const [patientId, setPatientId] = useState<string>("");
  const [specialistId, setSpecialistId] = useState<string>("");
  const [description, setDescription] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { data: transactionsResp, isLoading: isLoadingTx, error: errorTx } = useQuery<any>({
    queryKey: ["cash-transactions", fromDate, toDate],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (fromDate) sp.set("from", fromDate);
      if (toDate) sp.set("to", toDate);
      const res = await fetch(`/api/cash-transactions?${sp.toString()}`);
      if (!res.ok) throw new Error("Kasa hareketleri yüklenemedi");
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return { items };
    },
    enabled: !isUzman,
  });
  const transactions = Array.isArray(transactionsResp?.items) ? transactionsResp.items : [];

  const { data: paymentsSummaryResp } = useQuery<any>({
    queryKey: ["payments-summary"],
    queryFn: async () => {
      const res = await fetch("/api/payments/list");
      if (!res.ok) return { items: [] };
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return { items };
    },
  });
  const paymentsSummary = Array.isArray(paymentsSummaryResp?.items) ? paymentsSummaryResp.items : [];

  const { data: patientsResp } = useQuery<any>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
  });
  const patients = Array.isArray(patientsResp) ? patientsResp : [];

  const { data: specialistsResp } = useQuery<any>({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) return [];
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : (Array.isArray(json?.experts) ? json.experts : []));
      return items;
    },
  });
  const specialists = Array.isArray(specialistsResp) ? specialistsResp : [];

  const { data: categoriesResp } = useQuery<any>({
    queryKey: ["finance-categories"],
    queryFn: async () => {
      const res = await fetch("/api/finance/categories");
      if (!res.ok) return { items: [] };
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return { items };
    },
  });
  const categories = Array.isArray(categoriesResp?.items) ? categoriesResp.items : [];
  const [categoryId, setCategoryId] = useState("");

  const [dateStr, setDateStr] = useState("");
  const addTransaction = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cash-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "INCOME" ? "IN" : "OUT",
          category: type === "INCOME" ? "DIGER_GELIR" : "DIGER_GIDER",
          categoryId: categoryId || undefined,
          amount: parseFloat(amount),
          description,
          patientId: patientId || undefined,
          specialistId: specialistId || undefined,
          date: dateStr || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Kayıt başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      setAmount("");
      setDescription("");
      setPatientId("");
      setSpecialistId("");
      setCategoryId("");
      setDateStr("");
      show("İşlem başarıyla eklendi", "success");
      qc.invalidateQueries({ queryKey: ["cash-transactions"] });
    },
    onError: (e: any) => {
      show(e.message || "İşlem eklenemedi", "error");
    },
  });

  const totalIn = transactions.filter((t: any) => t.type === "IN").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter((t: any) => t.type === "OUT").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalIncome = totalIn;
  const totalExpense = totalOut;
  const net = totalIncome - totalExpense;

  

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Finans</h1>
        </div>
        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Ödemeler</TabsTrigger>
            <TabsTrigger value="accruals">Hakedişler</TabsTrigger>
            {!isUzman && <TabsTrigger value="accounting">Kasa / Muhasebe</TabsTrigger>}
            {!isUzman && <TabsTrigger value="plans">Planlı Ödemeler</TabsTrigger>}
          </TabsList>

          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="accruals">
            <AccrualsTab />
          </TabsContent>

          {!isUzman && (
          <TabsContent value="accounting">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Toplam Gelir</p><p className="text-2xl font-semibold text-green-700">{totalIncome.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
          <Card className="bg-red-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Toplam Gider</p><p className="text-2xl font-semibold text-red-700">{totalExpense.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
          <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Net Kasa</p><p className="text-2xl font-semibold text-blue-700">{net.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-600">Başlangıç Tarihi</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Bitiş Tarihi</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Gelir / Gider Kaydı Ekle</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Tür</label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Tür seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Gelir</SelectItem>
                    <SelectItem value="EXPENSE">Gider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Tutar (₺)</label>
                <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Kategori</label>
                <Select value={categoryId} onValueChange={(v) => {
                  setCategoryId(v);
                  const cat = categories.find((c: any) => c.id === v);
                  if (cat) setType(cat.type === "INCOME" ? "INCOME" : "EXPENSE");
                }}>
                  <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.type === "INCOME" ? "Gelir" : "Gider"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Hasta (opsiyonel)</label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Hasta seçin" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Uzman (opsiyonel)</label>
                <Select value={specialistId} onValueChange={setSpecialistId}>
                  <SelectTrigger><SelectValue placeholder="Uzman seçin" /></SelectTrigger>
                  <SelectContent>
                    {specialists.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Tarih</label>
                <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Açıklama</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama" />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => addTransaction.mutate()} disabled={addTransaction.isPending || !amount}>Ekle</Button>
            </div>
          </CardContent>
        </Card>

        

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Kasa Hareketleri</h2>
          </CardHeader>
          <CardContent>
            {isLoadingTx && (
              <p className="text-gray-500">Yükleniyor...</p>
            )}
            {errorTx && !isLoadingTx && (
              <p className="text-red-600">Kasa hareketleri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
            )}
            {!isLoadingTx && !errorTx && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-2">Tarih</th>
                      <th className="text-left px-4 py-2">Tip</th>
                      <th className="text-left px-4 py-2">Kategori</th>
                      <th className="text-left px-4 py-2">Hasta</th>
                      <th className="text-left px-4 py-2">Uzman</th>
                      <th className="text-left px-4 py-2">Tutar</th>
                      <th className="text-left px-4 py-2">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!Array.isArray(transactions) || transactions.length === 0) ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">Henüz işlem yok</td></tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-4 py-2">{new Date(t.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-2">{t.type === "IN" ? "Giriş" : "Çıkış"}</td>
                          <td className="px-4 py-2">{t.category?.replace(/_/g, " ")}</td>
                          <td className="px-4 py-2">{t.patient?.name || "-"}</td>
                          <td className="px-4 py-2">{t.specialist?.name || "-"}</td>
                          <td className="px-4 py-2">{t.amount.toLocaleString("tr-TR")} ₺</td>
                          <td className="px-4 py-2">{t.description || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>
          )}

          {!isUzman && (
          <TabsContent value="plans">
            <PlansTab />
          </TabsContent>
          )}
        </Tabs>
      </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const { show } = useToast();
  type Plan = {
    id: string;
    type: "INCOMING" | "OUTGOING";
    amount: number;
    dueDate: string;
    status: "PLANNED" | "PAID" | "CANCELED";
    description?: string;
    patient?: { id: string; name: string } | null;
    specialist?: { id: string; name: string } | null;
  };
  const [type, setType] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [patientId, setPatientId] = useState("");
  const [specialistId, setSpecialistId] = useState("");
  const [description, setDescription] = useState("");
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["payment-plans"],
    queryFn: async () => {
      const res = await fetch("/api/payment-plans");
      if (!res.ok) throw new Error("Planlar yüklenemedi");
      return res.json();
    },
  });
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) return [];
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return items;
    },
  });
  const { data: specialists = [] } = useQuery<any[]>({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      if (!res.ok) return [];
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : (Array.isArray(json?.experts) ? json.experts : []));
      return items;
    },
  });
  const createPlan = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payment-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, amount: parseFloat(amount), dueDate, description, patientId: patientId || undefined, specialistId: specialistId || undefined }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Plan oluşturulamadı"); }
      return res.json();
    },
    onSuccess: () => { setAmount(""); setDueDate(""); setPatientId(""); setSpecialistId(""); setDescription(""); show("Plan oluşturuldu", "success"); qc.invalidateQueries({ queryKey: ["payment-plans"] }); },
    onError: (e: any) => show(e.message || "Hata oluştu", "error"),
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "PAID" | "CANCELED" }) => { const res = await fetch(`/api/payment-plans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Güncelleme başarısız"); } return res.json(); },
    onSuccess: (_, vars) => { show(vars.status === "PAID" ? "Ödeme tamamlandı" : "Plan iptal edildi", "success"); qc.invalidateQueries({ queryKey: ["payment-plans"] }); qc.invalidateQueries({ queryKey: ["transactions"] }); qc.invalidateQueries({ queryKey: ["payments"] }); },
    onError: (e: any) => show(e.message || "Güncelleme yapılamadı", "error"),
  });
  const upcomingCount = plans.filter(p => p.status === "PLANNED").length;
  const totalPlanned = plans.filter(p => p.status === "PLANNED").reduce((s, p) => s + p.amount, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-yellow-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Bekleyen Plan</p><p className="text-2xl font-semibold text-yellow-700">{upcomingCount}</p></CardContent></Card>
        <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Toplam Bekleyen Tutar</p><p className="text-2xl font-semibold text-blue-700">{totalPlanned.toLocaleString("tr-TR")} ₺</p></CardContent></Card>
        <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Son İşlem</p><p className="text-2xl font-semibold text-green-700">{plans[0]?.amount?.toLocaleString("tr-TR") || 0} ₺</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Yeni Plan Oluştur</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Tür</label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue placeholder="Tür seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMING">Gelecek Gelir</SelectItem>
                  <SelectItem value="OUTGOING">Gelecek Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Tutar (₺)</label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Vade Tarihi</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Hasta (opsiyonel)</label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Hasta seçin" /></SelectTrigger>
                <SelectContent>
                    {Array.isArray(patients) && patients.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Uzman (opsiyonel)</label>
              <Select value={specialistId} onValueChange={setSpecialistId}>
                <SelectTrigger><SelectValue placeholder="Uzman seçin" /></SelectTrigger>
                <SelectContent>
                    {Array.isArray(specialists) && specialists.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Açıklama</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => createPlan.mutate()} disabled={createPlan.isPending || !amount || !dueDate}>Oluştur</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Planlar</h2></CardHeader>
        <CardContent>
          {isLoading ? (<p className="text-gray-500">Yükleniyor...</p>) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-2">Vade</th>
                    <th className="text-left px-4 py-2">Tür</th>
                    <th className="text-left px-4 py-2">Tutar</th>
                    <th className="text-left px-4 py-2">Hasta</th>
                    <th className="text-left px-4 py-2">Uzman</th>
                    <th className="text-left px-4 py-2">Durum</th>
                    <th className="text-left px-4 py-2">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Henüz plan yok</td></tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-4 py-2">{new Date(p.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-2">{p.type === "INCOMING" ? "Gelir" : "Gider"}</td>
                        <td className="px-4 py-2">{p.amount.toLocaleString("tr-TR")} ₺</td>
                        <td className="px-4 py-2">{p.patient?.name || "-"}</td>
                        <td className="px-4 py-2">{p.specialist?.name || "-"}</td>
                        <td className="px-4 py-2">{p.status === "PLANNED" ? "Bekliyor" : p.status === "PAID" ? "Ödendi" : "İptal"}</td>
                        <td className="px-4 py-2 space-x-2">
                          <Button variant="outline" size="sm" disabled={p.status !== "PLANNED"} onClick={() => updateStatus.mutate({ id: p.id, status: "PAID" })}>Ödendi</Button>
                          <Button variant="outline" size="sm" disabled={p.status !== "PLANNED"} onClick={() => updateStatus.mutate({ id: p.id, status: "CANCELED" })}>İptal</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
