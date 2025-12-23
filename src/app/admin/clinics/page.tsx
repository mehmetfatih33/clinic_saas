import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { hasFeature } from "@/lib/features";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    c.set("active_clinic_id", clinicId, { path: "/", httpOnly: false });
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
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Klinikler</h1>
        {canCreateClinic && (
          <Link href="/admin/clinics/new" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Yeni Klinik Oluştur</Link>
        )}
      </div>

      {created && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">Klinik oluşturuldu</div>
      )}

      <div className="mt-6 rounded-lg border bg-white p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2">Klinik Adı</th>
                <th className="text-left px-4 py-2">Slug</th>
                <th className="text-left px-4 py-2">Admin E‑posta</th>
                <th className="text-left px-4 py-2">Aktif Plan</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-left px-4 py-2">Detay</th>
                <th className="text-left px-4 py-2">Hızlı Geçiş</th>
              </tr>
            </thead>
            <tbody>
              {clinics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Henüz klinik oluşturulmamış</td>
                </tr>
              ) : (
                clinics.map((c) => {
                  const adminEmail = c.users?.[0]?.email || "-";
                  const latestPlan = c.clinicPlans?.[0] || null;
                  const activePlan = latestPlan?.plan?.name || "-";
                  const status = latestPlan?.isActive ? "Aktif" : "Pasif";
                  const endDate = latestPlan?.endDate ? new Date(latestPlan.endDate as any) : null;
                  const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2">{c.slug}</td>
                      <td className="px-4 py-2">{adminEmail}</td>
                      <td className="px-4 py-2">{activePlan}</td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        <span>{status}</span>
                        {typeof daysLeft === "number" && (
                          <span className="text-xs text-gray-500">(Kalan: {daysLeft} gün)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/clinics/${c.id}`} className="rounded border px-3 py-1">Detay</Link>
                      </td>
                      <td className="px-4 py-2">
                        <form action={switchClinicAction}>
                          <input type="hidden" name="clinicId" value={c.id} />
                          <button className="rounded border px-3 py-1">Bu kliniğe geç</button>
                        </form>
                        {isSuperAdmin && c.id === activeClinicId && (
                          <form action={toggleClinicActiveAction} className="mt-2 inline-block">
                            <input type="hidden" name="clinicId" value={c.id} />
                            <button className="rounded border px-3 py-1">
                              {status === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
