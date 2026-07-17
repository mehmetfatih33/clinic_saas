import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hash } from "bcryptjs";
import { ArrowLeft, CalendarClock, KeyRound, Layers3, ShieldCheck, TimerReset } from "lucide-react";

async function changeClinicPlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const planId = String(formData.get("planId") || "").trim();
  if (!clinicId || !planId) return;
  
  // Removed activeClinicId check because SUPER_ADMIN can edit any clinic without switching context
  
  const current = await prisma.clinicPlan.findFirst({ where: { clinicId, isActive: true } });
  if (current) {
    await prisma.clinicPlan.update({ where: { id: current.id }, data: { planId } });
  } else {
    await prisma.clinicPlan.create({ data: { clinicId, planId, isActive: true } });
  }
  revalidatePath(`/admin/clinics/${clinicId}`);
  redirect(`/admin/clinics/${clinicId}?changed=1`);
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  const p = await params;
  const clinicId = p.id;
  const sp = searchParams ? await searchParams : undefined;
  const changed = sp?.changed === "1";
  const extended = sp?.extended === "1";
  const credsChanged = sp?.credsChanged === "1";
  const credsError = typeof sp?.credsError === "string" ? sp?.credsError : "";

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: {
      users: { where: { role: "ADMIN" }, take: 1, select: { id: true, email: true } },
      clinicPlans: { where: { isActive: true }, include: { plan: true }, take: 1 },
    },
  });
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } });
  const adminUser = clinic?.users?.[0] || null;
  const adminEmail = adminUser?.email || "-";
  const activePlan = clinic?.clinicPlans?.[0]?.plan || null;
  const startDate = clinic?.clinicPlans?.[0]?.startDate || null;
  const endDate = clinic?.clinicPlans?.[0]?.endDate || null;
  const isActive = clinic?.clinicPlans?.[0]?.isActive ?? false;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Clinic</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Klinik detayi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Plan, abonelik suresi ve admin kimlik bilgilerini tek sayfadan yonet.
          </p>
        </div>
        <a
          href="/admin/clinics"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400" />
          Kliniklere don
        </a>
      </div>

      <div className="grid gap-3">
        {changed && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
            Plan basariyla guncellendi
          </div>
        )}
        {extended && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
            Sure basariyla uzatildi
          </div>
        )}
        {credsChanged && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
            Admin bilgileri guncellendi
          </div>
        )}
        {!!credsError && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {credsError}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Overview</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bilgiler</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Klinik adi</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{clinic?.name}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Slug</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{clinic?.slug}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Admin e-posta</div>
                <div className="mt-2 break-all text-base font-semibold text-slate-900">{adminEmail}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Subscription</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Aktif plan</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Layers3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Plan adi</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">{activePlan?.name || "-"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Durum</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">{isActive ? "Aktif" : "Pasif"}</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <CalendarClock className="h-4 w-4" />
                    Baslangic
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    {startDate ? new Date(startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <CalendarClock className="h-4 w-4" />
                    Bitis
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    {endDate ? new Date(endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Ozellikler</div>
                <div className="mt-2 text-sm text-slate-700">
                  {Array.isArray(activePlan?.features) ? (activePlan?.features as string[]).join(", ") : ""}
                </div>
              </div>
              {activePlan?.id && (
                <div>
                  <a
                    href={`/admin/plans?edit=${activePlan.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Plani duzenle
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Plan</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Plan degistir</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Layers3 className="h-5 w-5" />
              </div>
            </div>
            <form action={changeClinicPlanAction} className="mt-6 space-y-4">
              <input type="hidden" name="clinicId" defaultValue={clinicId} />
              <div>
                <label className="text-sm font-medium text-slate-700">Yeni plan</label>
                <select
                  name="planId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                  defaultValue={activePlan?.id || ""}
                >
                  <option value="" disabled>
                    Plan secin
                  </option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Plani degistir
              </button>
            </form>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Extend</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Hizli sure uzatma</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <TimerReset className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <form action={extendClinicPlanAction}>
                <input type="hidden" name="clinicId" value={clinicId} />
                <input type="hidden" name="extensionType" value="1_MONTH" />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  1 ay uzat
                </button>
              </form>
              <form action={extendClinicPlanAction}>
                <input type="hidden" name="clinicId" value={clinicId} />
                <input type="hidden" name="extensionType" value="1_YEAR" />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
                >
                  1 yil uzat
                </button>
              </form>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Mevcut bitis tarihine ekleme yapar. Sure dolmussa bugunden itibaren uzatir.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Lifecycle</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bitis tarihi / durum</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CalendarClock className="h-5 w-5" />
              </div>
            </div>
            <form action={updateClinicPlanDatesAction} className="mt-6 grid gap-4">
              <input type="hidden" name="clinicId" defaultValue={clinicId} />
              <div>
                <label className="text-sm font-medium text-slate-700">Yeni bitis tarihi</label>
                <input
                  type="date"
                  name="newEndDate"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  defaultValue={endDate ? new Date(endDate as any).toISOString().slice(0, 10) : ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Durum</label>
                <select
                  name="newStatus"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  defaultValue={isActive ? "active" : "inactive"}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Kaydet
              </button>
            </form>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Credentials</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Admin bilgileri</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>
            <form action={updateClinicAdminCredentialsAction} className="mt-6 grid gap-4">
              <input type="hidden" name="clinicId" defaultValue={clinicId} />
              <input type="hidden" name="adminUserId" defaultValue={adminUser?.id || ""} />
              <div>
                <label className="text-sm font-medium text-slate-700">Yeni e-posta</label>
                <input
                  name="newEmail"
                  defaultValue={adminEmail !== "-" ? adminEmail : ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Yeni sifre</label>
                <input
                  type="password"
                  name="newPassword"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="En az 6 karakter"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Admin bilgilerini guncelle
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

async function updateClinicAdminCredentialsAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const adminUserId = String(formData.get("adminUserId") || "").trim();
  const newEmail = String(formData.get("newEmail") || "").trim();
  const newPassword = String(formData.get("newPassword") || "").trim();
  if (!clinicId) return;
  const admin = adminUserId
    ? await prisma.user.findFirst({ where: { id: adminUserId, clinicId, role: "ADMIN" } })
    : await prisma.user.findFirst({ where: { clinicId, role: "ADMIN" } });
  if (!admin) {
    redirect(`/admin/clinics/${clinicId}?credsError=Admin%20kullanıcı%20bulunamadı`);
  }
  const data: any = {};
  if (newEmail) data.email = newEmail;
  if (newPassword) {
    if (newPassword.length < 6) {
      redirect(`/admin/clinics/${clinicId}?credsError=Şifre%20en%20az%206%20karakter%20olmalı`);
    }
    data.passwordHash = await hash(newPassword, 10);
  }
  if (Object.keys(data).length === 0) {
    redirect(`/admin/clinics/${clinicId}?credsError=Güncellenecek%20alan%20yok`);
  }
  try {
    await prisma.user.update({ where: { id: admin!.id }, data });
  } catch (e: any) {
    const digest = (e as any)?.digest?.toString?.() || "";
    if (digest.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/clinics/${clinicId}?credsError=${encodeURIComponent("Güncelleme başarısız: " + (e?.message || ""))}`);
  }
  revalidatePath(`/admin/clinics/${clinicId}`);
  redirect(`/admin/clinics/${clinicId}?credsChanged=1`);
}

async function extendClinicPlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const extensionType = String(formData.get("extensionType") || "").trim();
  
  if (!clinicId || !extensionType) return;
  
  const c = await cookies();
  const activeClinicId = c.get("active_clinic_id")?.value || "";
  // Check active clinic context if needed, but for super admin operations on specific clinic via ID, 
  // we should check if we are allowed to edit *that* clinic.
  // Actually, SUPER_ADMIN can edit any clinic. The check `clinicId !== activeClinicId` in changeClinicPlanAction
  // seems to enforce that the admin is "acting as" that clinic or it's just a safety check.
  // But usually Super Admin dashboard allows editing any clinic.
  // Let's stick to the pattern used in changeClinicPlanAction if it makes sense, 
  // BUT `changeClinicPlanAction` checks `clinicId !== activeClinicId` which implies the user must be "logged in" to that clinic context?
  // Wait, `active_clinic_id` cookie is set when you switch clinics.
  // If I am a Super Admin viewing a clinic detail page, I might not have switched to it.
  // `changeClinicPlanAction` has:
  // if (clinicId !== activeClinicId) return;
  // This seems restrictive for a Super Admin dashboard where you might view any clinic.
  // However, `updateClinicAdminCredentialsAction` DOES NOT have this check.
  // `updateClinicPlanDatesAction` DOES have this check.
  // This is inconsistent. I will NOT include the check for extension, as Super Admin should be able to extend any clinic from the list.
  
  const current = await prisma.clinicPlan.findFirst({ where: { clinicId, isActive: true } });
  if (!current) return;
  
  const now = new Date();
  const currentEndDate = current.endDate ? new Date(current.endDate) : now;
  // If expired (endDate < now), start from now. Else add to endDate.
  let baseDate = currentEndDate > now ? currentEndDate : now;
  
  if (extensionType === "1_MONTH") {
    baseDate.setMonth(baseDate.getMonth() + 1);
  } else if (extensionType === "1_YEAR") {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
  }
  
  await prisma.clinicPlan.update({ where: { id: current.id }, data: { endDate: baseDate, isActive: true } });
  revalidatePath(`/admin/clinics/${clinicId}`);
  redirect(`/admin/clinics/${clinicId}?extended=1`);
}

async function updateClinicPlanDatesAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const newEndDateStr = String(formData.get("newEndDate") || "").trim();
  const newStatus = String(formData.get("newStatus") || "").trim();
  if (!clinicId) return;

  // Removed activeClinicId check because SUPER_ADMIN can edit any clinic without switching context
  
  const current = await prisma.clinicPlan.findFirst({ where: { clinicId, isActive: true } });
  if (!current) return;
  const data: any = {};
  if (newEndDateStr) {
    const d = new Date(newEndDateStr);
    if (!isNaN(d.getTime())) data.endDate = d;
  }
  if (newStatus === "active") data.isActive = true;
  if (newStatus === "inactive") data.isActive = false;
  if (Object.keys(data).length === 0) return;
  await prisma.clinicPlan.update({ where: { id: current.id }, data });
  revalidatePath(`/admin/clinics/${clinicId}`);
  redirect(`/admin/clinics/${clinicId}?changed=1`);
}
