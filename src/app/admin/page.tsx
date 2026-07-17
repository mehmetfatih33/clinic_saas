import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/mailer";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers3,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function toneForDays(days: number | null) {
  if (days === null) {
    return {
      text: "text-slate-600",
      badge: "border-slate-200 bg-slate-100 text-slate-700",
      panel: "border-slate-200 bg-slate-50",
    };
  }

  if (days <= 7) {
    return {
      text: "text-red-600",
      badge: "border-red-200 bg-red-50 text-red-700",
      panel: "border-red-200 bg-red-50/70",
    };
  }

  if (days <= 15) {
    return {
      text: "text-orange-600",
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      panel: "border-orange-200 bg-orange-50/70",
    };
  }

  if (days <= 30) {
    return {
      text: "text-amber-600",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      panel: "border-amber-200 bg-amber-50/70",
    };
  }

  return {
    text: "text-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50/70",
  };
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const c = await cookies();
  const activeClinicId = c.get("active_clinic_id")?.value || session.user.clinicId;

  const clinic = activeClinicId
    ? await prisma.clinic.findUnique({
        where: { id: activeClinicId },
        include: {
          users: { where: { role: "ADMIN" }, take: 1, select: { email: true } },
        },
      })
    : null;

  const clinicPlans = clinic
    ? await prisma.clinicPlan.findMany({
        where: { clinicId: clinic.id },
        include: { plan: true },
        orderBy: { startDate: "desc" },
        take: 1,
      })
    : [];

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalClinics = await prisma.clinic.count();
  const activePlansCount = await prisma.clinicPlan.count({ where: { isActive: true } });

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringPlans = await prisma.clinicPlan.findMany({
    where: {
      isActive: true,
      endDate: {
        not: null,
        lte: thirtyDaysFromNow,
        gte: new Date(new Date().setDate(new Date().getDate() - 1)),
      },
    },
    include: {
      clinic: true,
      plan: true,
    },
    orderBy: {
      endDate: "asc",
    },
    take: 10,
  });

  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { email: true },
  });
  const superAdminEmails = superAdmins.map((u) => u.email).filter(Boolean) as string[];

  if (clinic) {
    const cp = clinicPlans[0] || null;
    if (cp?.endDate && cp?.startDate) {
      const start = new Date(cp.startDate as Date);
      const end = new Date(cp.endDate as Date);
      const cycleDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const isYearly = cycleDays >= 300;
      const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (isYearly && daysLeft <= 15 && daysLeft >= 0) {
        const already = await prisma.auditLog.findFirst({
          where: {
            clinicId: clinic.id,
            action: "RENEWAL_REMINDER_SENT",
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!already) {
          const subject = `Klinik Yenileme Hatırlatması: ${clinic.name}`;
          const html = `Merhaba,<br/>${clinic.name} kliniğinin aboneliği ${end.toLocaleDateString()} tarihinde yenilenecektir.<br/>Kalan süre: ${daysLeft} gün.`;

          if (superAdminEmails.length) {
            await sendEmail(superAdminEmails, subject, html);
          }

          await prisma.auditLog.create({
            data: {
              clinicId: clinic.id,
              actorId: session.user.id,
              action: "RENEWAL_REMINDER_SENT",
              entity: "ClinicPlan",
              entityId: cp.id,
              meta: { daysLeft } as any,
            },
          });
        }
      }
    }
  }

  async function updateActiveClinicPlanAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") return;

    const c = await cookies();
    const activeClinicId = c.get("active_clinic_id")?.value || session.user.clinicId;
    const planId = String(formData.get("planId") || "").trim();
    if (!planId) return;

    const current = await prisma.clinicPlan.findFirst({
      where: { clinicId: activeClinicId, isActive: true },
    });

    if (current) {
      await prisma.clinicPlan.update({ where: { id: current.id }, data: { planId } });
    } else {
      await prisma.clinicPlan.create({ data: { clinicId: activeClinicId, planId, isActive: true } });
    }

    redirect("/admin");
  }

  async function updateActiveClinicPlanDatesAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") return;

    const c = await cookies();
    const activeClinicId = c.get("active_clinic_id")?.value || session.user.clinicId;
    const newEndDateStr = String(formData.get("newEndDate") || "").trim();
    const newStatus = String(formData.get("newStatus") || "").trim();
    const current = await prisma.clinicPlan.findFirst({
      where: { clinicId: activeClinicId, isActive: true },
    });
    if (!current) return;

    const data: Record<string, unknown> = {};
    if (newEndDateStr) {
      const d = new Date(newEndDateStr);
      if (!isNaN(d.getTime())) data.endDate = d;
    }
    if (newStatus === "active") data.isActive = true;
    if (newStatus === "inactive") data.isActive = false;
    if (Object.keys(data).length === 0) return;

    await prisma.clinicPlan.update({ where: { id: current.id }, data });
    redirect("/admin");
  }

  const selectedPlan = clinicPlans[0] || null;
  const selectedEndDate = selectedPlan?.endDate ? new Date(selectedPlan.endDate as Date) : null;
  const selectedDaysLeft = selectedEndDate
    ? Math.ceil((selectedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const selectedTone = toneForDays(selectedDaysLeft);
  const renewalAlertsCount = expiringPlans.filter((item) => {
    if (!item.endDate) return false;
    const daysLeft = Math.ceil(
      (new Date(item.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return daysLeft <= 15;
  }).length;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl shadow-slate-900/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_28%)]" />
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Super Admin Control Center
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Klinik portfoyun, yenileme takvimin ve plan operasyonların tek merkezde.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Bugun oncelikli olarak lisans yenilemeleri, aktif plan dagilimi ve secili klinigin yasam dongusu yonetimi burada toplanir.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Secili Klinik</div>
                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  {clinic?.name || "Klinik secilmedi"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Aktif Plan</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {selectedPlan?.plan?.name || "Atanmamis"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Yenileme Alarmi</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {renewalAlertsCount} klinik kritik esikte
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-[24px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Canli Durum</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Portfoy Nabzi</h2>
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200">
                Tum sistem aktif
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Toplam klinik</span>
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{totalClinics}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="text-sm text-slate-300">Aktif plan</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{activePlansCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="text-sm text-slate-300">Yaklasan bitis</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{expiringPlans.length}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4 text-sm text-slate-200">
                Secili klinigin plan takibi, yenileme mail tetigi ve durum guncellemesi ayni panelden yonetiliyor.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Toplam Klinik</span>
            <LayoutGrid className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{totalClinics}</div>
          <div className="mt-2 text-sm text-slate-500">Portfoydeki tum aktif ve pasif kayitlar</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Aktif Planlar</span>
            <Layers3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{activePlansCount}</div>
          <div className="mt-2 text-sm text-slate-500">Devam eden lisans ve paket dagilimi</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Kritik Yenileme</span>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{renewalAlertsCount}</div>
          <div className="mt-2 text-sm text-slate-500">15 gun ve altina dusen abonelikler</div>
        </div>

        <div className={`rounded-3xl border p-5 shadow-sm ${selectedTone.panel}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Secili Klinik Durumu</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">
            {selectedPlan?.isActive ? "Aktif" : "Pasif"}
          </div>
          <div className={`mt-2 text-sm font-medium ${selectedTone.text}`}>
            {selectedDaysLeft !== null ? `${selectedDaysLeft} gun kaldi` : "Bitis tarihi tanimli degil"}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Renewal Watch</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Suresi yaklasan klinikler</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Yenileme operasyonunu aksatmadan yonetmek icin en kritik 10 klinik burada siralanir.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              <CalendarClock className="h-4 w-4" />
              {expiringPlans.length} kayit izleniyor
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {expiringPlans.length > 0 ? (
              expiringPlans.map((ep) => {
                const end = ep.endDate ? new Date(ep.endDate) : null;
                const daysLeft = end
                  ? Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const tone = toneForDays(daysLeft);

                return (
                  <div
                    key={ep.id}
                    className={`rounded-2xl border p-4 transition-colors hover:border-slate-300 ${tone.panel}`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{ep.clinic.name}</h3>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {ep.plan.name}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span>Bitis: {formatDate(end)}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>Plan slug: {ep.plan.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone.badge}`}>
                          {daysLeft !== null ? `${daysLeft} gun` : "Tarih yok"}
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Yaklasan bitis bulunmuyor</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Son 30 gun icinde sona erecek aktif plan kaydi bulunmadi.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-100 pb-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected Clinic</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Secili klinik ozeti</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Aktif klinigin lisans, durum ve yonetim ozetini hizli karar vermek icin sade bir panelde sunar.
            </p>
          </div>

          {clinic ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{clinic.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{clinic.slug}.panel</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      clinic.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {clinic.isActive ? "Acik" : "Kapali"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Plan</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {selectedPlan?.plan?.name || "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Admin Mail</div>
                    <div className="mt-2 break-all text-base font-semibold text-slate-900">
                      {clinic.users?.[0]?.email || "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Bitis</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {formatDate(selectedEndDate)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Kalan Sure</div>
                    <div className={`mt-2 text-base font-semibold ${selectedTone.text}`}>
                      {selectedDaysLeft !== null ? `${selectedDaysLeft} gun` : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-3xl border p-5 ${selectedTone.panel}`}>
                <div className="flex items-center gap-2">
                  <Clock3 className={`h-4 w-4 ${selectedTone.text}`} />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Plan Durumu
                  </h3>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${selectedTone.badge}`}>
                    {selectedPlan?.isActive ? "Aktif lisans" : "Pasif lisans"}
                  </span>
                  <span className="text-sm text-slate-600">
                    {selectedPlan?.plan?.slug ? `Slug: ${selectedPlan.plan.slug}` : "Plan bilgisi bekleniyor"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Secili klinik bulunamadi</h3>
              <p className="mt-2 text-sm text-slate-500">
                Klinikler sayfasindan bir kayit secerek bu paneli aktif hale getirebilirsin.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-100 pb-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Plan Assignment</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Plani degistir</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Secili klinigi farkli bir pakete gecirerek ozellik kapsamini aninda guncelle.
            </p>
          </div>

          <form action={updateActiveClinicPlanAction} className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700">Plan secimi</label>
              <select
                name="planId"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                required
                defaultValue={selectedPlan?.planId || ""}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Plani kaydet
            </button>
          </form>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-100 pb-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Lifecycle Controls</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Bitis tarihi ve durum</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Lisans yasam dongusunu yeni tarih atayarak veya durumu pasife cekerek dogrudan yonet.
            </p>
          </div>

          <form action={updateActiveClinicPlanDatesAction} className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-medium text-slate-700">Yeni bitis tarihi</label>
              <input
                type="date"
                name="newEndDate"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                defaultValue={selectedEndDate ? selectedEndDate.toISOString().slice(0, 10) : ""}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Durum</label>
              <select
                name="newStatus"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                defaultValue={selectedPlan?.isActive ? "active" : "inactive"}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Degisiklikleri uygula
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
