import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import Link from "next/link";
import { hasFeature } from "@/lib/features";
import { ArrowLeft, Building2, CheckCircle2, KeyRound, Layers3, Sparkles } from "lucide-react";

async function createClinicWithPlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") {
    if (role === "ADMIN") {
      const ok = await hasFeature(session!.user.clinicId, "multi-user");
      if (!ok) return;
    } else return;
  }

  const clinicName = String(formData.get("clinicName") || "").trim();
  const clinicSlugInput = String(formData.get("clinicSlug") || "").trim();
  const clinicSlug = clinicSlugInput || clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const adminName = String(formData.get("adminName") || "").trim();
  const adminEmail = String(formData.get("adminEmail") || "").trim();
  const adminPassword = String(formData.get("adminPassword") || "").trim();
  const planId = String(formData.get("planId") || "").trim();
  const duration = String(formData.get("duration") || "15_DAYS");

  if (!clinicName || !clinicSlug || !adminName || !adminEmail || !adminPassword || !planId) {
    redirect("/admin/clinics/new?error=Gerekli%20alanlar%20eksik");
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      const passwordHash = await hash(adminPassword, 10);
      const clinic = await tx.clinic.create({ data: { name: clinicName, slug: clinicSlug } });
      await tx.user.create({
        data: { email: adminEmail, name: adminName, role: "ADMIN", clinicId: clinic.id, passwordHash },
      });

      // Default room creation
      await tx.room.create({
        data: {
          clinicId: clinic.id,
          name: "Muayene Odası 1",
        }
      });

      const start = new Date();
      const end = new Date(start);
      
      if (duration === "1_YEAR") {
        end.setFullYear(end.getFullYear() + 1);
      } else if (duration === "1_MONTH") {
        end.setMonth(end.getMonth() + 1);
      } else {
        // Default 15 days (15_DAYS)
        end.setDate(end.getDate() + 15);
      }
      
      await tx.clinicPlan.create({ data: { clinicId: clinic.id, planId, isActive: true, startDate: start, endDate: end } });
    });
  } catch (e: any) {
    const msg = e?.message || "Oluşturma başarısız";
    redirect(`/admin/clinics/new?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin/clinics");
  redirect("/admin/clinics?created=1");
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) redirect("/login");
  if (role !== "SUPER_ADMIN") {
    if (role === "ADMIN") {
      const ok = await hasFeature(session.user.clinicId, "multi-user");
      if (!ok) redirect("/admin/clinics");
    } else {
      redirect("/admin/clinics");
    }
  }

  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } });
  const sp = searchParams ? await searchParams : undefined;
  const error = typeof sp?.error === "string" ? sp.error : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">New Tenant</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Yeni Klinik</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Klinik kaydini, admin hesabini ve plan kurulumunu tek adimda olustur.
          </p>
        </div>
        <Link
          href="/admin/clinics"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400" />
          Kliniklere don
        </Link>
      </div>

      {!!error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
          {error}
        </div>
      )}

      <form action={createClinicWithPlanAction} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Clinic</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Klinik bilgileri</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Building2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Klinik adi</label>
                <input
                  name="clinicName"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Slug</label>
                <input
                  name="clinicSlug"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="bos birakabilirsin"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Klinik admin hesabi</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Ad Soyad</label>
                <input
                  name="adminName"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">E-posta</label>
                <input
                  type="email"
                  name="adminEmail"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Sifre</label>
                <input
                  type="password"
                  name="adminPassword"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Plan</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Paket ve sure</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Layers3 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700">Plan secimi</label>
                <select
                  name="planId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                  defaultValue=""
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

              <div>
                <label className="text-sm font-medium text-slate-700">Abonelik suresi</label>
                <div className="mt-2 grid gap-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="duration" value="15_DAYS" defaultChecked />
                      <span>15 gun (ucretsiz)</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="duration" value="1_MONTH" />
                      <span>1 ay</span>
                    </div>
                    <Sparkles className="h-4 w-4 text-slate-400" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="duration" value="1_YEAR" />
                      <span>1 yil</span>
                    </div>
                    <Sparkles className="h-4 w-4 text-slate-400" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Klinigi olustur
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
