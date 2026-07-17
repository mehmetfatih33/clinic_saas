import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { hasFeature } from "@/lib/features";
import { getActiveClinicCookieOptions } from "@/lib/authz";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, ShieldCheck, Users2 } from "lucide-react";

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const sp = searchParams ? await searchParams : undefined;
  const created = sp?.created === "1";

  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "ADMIN" }, take: 1, select: { email: true } },
      clinicPlans: { include: { plan: true }, take: 1, orderBy: { startDate: "desc" } },
    },
  });
  const cks = await cookies();
  const activeClinicId = cks.get("active_clinic_id")?.value || "";

  async function switchClinicAction(formData: FormData) {
    "use server";
    const clinicId = String(formData.get("clinicId") || "").trim();
    if (!clinicId) return;
    const c = await cookies();
    c.set("active_clinic_id", clinicId, getActiveClinicCookieOptions());
    redirect("/dashboard");
  }

  async function toggleClinicActiveAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") return;
    const clinicId = String(formData.get("clinicId") || "").trim();
    if (!clinicId) return;
    const cks = await cookies();
    const activeClinicId = cks.get("active_clinic_id")?.value || "";
    if (clinicId !== activeClinicId) return;
    const current = await prisma.clinicPlan.findFirst({ where: { clinicId }, orderBy: { startDate: "desc" } });
    if (!current) return;
    await prisma.clinicPlan.update({ where: { id: current.id }, data: { isActive: !current.isActive } });
    redirect("/admin/clinics");
  }

  const canCreateClinic = isSuperAdmin || (session?.user?.role === "ADMIN" && await hasFeature(session.user.clinicId, "multi-user"));
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tenancy</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Klinikler</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Klinik portfoyunu izle, plana gore durumunu gor ve aktif klinik baglamini hizlica degistir.
          </p>
        </div>
        {canCreateClinic && (
          <Link
            href="/admin/clinics/new"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Yeni Klinik Olustur
          </Link>
        )}
      </div>

      {created && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          Klinik olusturuldu
        </div>
      )}

      {clinics.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm shadow-slate-200/60">
          <Building2 className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Henuz klinik yok</h2>
          <p className="mt-2 text-sm text-slate-500">Yeni bir klinik olusturarak portfoye ekleyebilirsin.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {clinics.map((c: any) => {
            const adminEmail = c.users?.[0]?.email || "-";
            const latestPlan = c.clinicPlans?.[0] || null;
            const activePlan = latestPlan?.plan?.name || "-";
            const planSlug = latestPlan?.plan?.slug || "-";
            const status = latestPlan?.isActive ? "Aktif" : "Pasif";
            const endDate = latestPlan?.endDate ? new Date(latestPlan.endDate as any) : null;
            const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isSelected = c.id === activeClinicId;
            const tone =
              typeof daysLeft === "number"
                ? daysLeft <= 7
                  ? "border-red-200 bg-red-50/70"
                  : daysLeft <= 15
                    ? "border-orange-200 bg-orange-50/70"
                    : daysLeft <= 30
                      ? "border-amber-200 bg-amber-50/70"
                      : "border-emerald-200 bg-emerald-50/70"
                : "border-slate-200 bg-slate-50";

            return (
              <div
                key={c.id}
                className={`relative overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:border-slate-300 ${isSelected ? "ring-1 ring-slate-950/10" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{c.slug}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Users2 className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">Admin:</span>
                        <span className="break-all">{adminEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">Plan:</span>
                        <span>{activePlan}</span>
                        <span className="text-slate-400">({planSlug})</span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-2xl border px-4 py-3 text-right ${tone}`}>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Durum</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">{status}</div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-sm text-slate-600">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      {typeof daysLeft === "number" ? `${daysLeft} gun` : "Tarih yok"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/admin/clinics/${c.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Detay
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Link>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <form action={switchClinicAction}>
                      <input type="hidden" name="clinicId" value={c.id} />
                      <button
                        className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                          isSelected
                            ? "border border-slate-200 bg-slate-50 text-slate-700"
                            : "bg-slate-950 text-white hover:bg-slate-800"
                        }`}
                        type="submit"
                      >
                        {isSelected ? "Secili" : "Bu klinige gec"}
                      </button>
                    </form>

                    {isSuperAdmin && isSelected && (
                      <form action={toggleClinicActiveAction}>
                        <input type="hidden" name="clinicId" value={c.id} />
                        <button
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                          type="submit"
                        >
                          {status === "Aktif" ? "Pasif yap" : "Aktif yap"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
