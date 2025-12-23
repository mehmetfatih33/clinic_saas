import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/mailer";

function colorForDays(days: number) {
  if (days <= 15) return "text-red-600";
  if (days <= 30) return "text-orange-600";
  if (days <= 60) return "text-yellow-600";
  return "text-gray-700";
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  const c = await cookies();
  const activeClinicId = c.get("active_clinic_id")?.value || session.user.clinicId;
  
  // Use a query that matches the actual Prisma schema to avoid type errors
  const clinic = activeClinicId ? await prisma.clinic.findUnique({
    where: { id: activeClinicId },
    include: {
      users: { where: { role: "ADMIN" }, take: 1, select: { email: true } },
    },
  }) : null;

  // Fetch clinic plans separately to avoid type errors with mismatched schema
  const clinicPlans = clinic ? await prisma.clinicPlan.findMany({
    where: { clinicId: clinic.id },
    include: { plan: true },
    orderBy: { startDate: "desc" },
    take: 1
  }) : [];

  // --- NEW: Global Stats for Dashboard ---
  const totalClinics = await prisma.clinic.count();
  
  // Expiring in next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringPlans = await prisma.clinicPlan.findMany({
    where: {
      isActive: true,
      endDate: {
        not: null,
        lte: thirtyDaysFromNow,
        gte: new Date(new Date().setDate(new Date().getDate() - 1)) // Include today/yesterday to be safe
      }
    },
    include: {
      clinic: true,
      plan: true
    },
    orderBy: {
      endDate: 'asc'
    },
    take: 10
  });
  // ---------------------------------------

  const superAdmins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { email: true } });
  const superAdminEmails = superAdmins.map((u) => u.email).filter(Boolean) as string[];

  // Hatırlatma gönderimi (yalnızca yıllık planlar, endDate <= 15 gün)
  if (clinic) {
    const cp = clinicPlans[0] || null;
    if (cp?.endDate && cp?.startDate) {
      const start = new Date(cp.startDate as any);
      const end = new Date(cp.endDate as any);
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
            data: { clinicId: clinic.id, actorId: session.user.id, action: "RENEWAL_REMINDER_SENT", entity: "ClinicPlan", entityId: cp.id, meta: { daysLeft } as any },
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
    const current = await prisma.clinicPlan.findFirst({ where: { clinicId: activeClinicId, isActive: true } });
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
    const current = await prisma.clinicPlan.findFirst({ where: { clinicId: activeClinicId, isActive: true } });
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
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">Genel bakış ve klinik yönetimi.</p>

      {/* Global Stats Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Toplam Klinik</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalClinics}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border shadow-sm col-span-1 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Süresi Yaklaşan Klinikler (İlk 10)</h3>
          {expiringPlans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-3 py-2">Klinik</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Bitiş</th>
                    <th className="px-3 py-2">Kalan Gün</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiringPlans.map(ep => {
                    const end = ep.endDate ? new Date(ep.endDate) : new Date();
                    const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={ep.id}>
                        <td className="px-3 py-2 font-medium">{ep.clinic.name}</td>
                        <td className="px-3 py-2">{ep.plan.name}</td>
                        <td className="px-3 py-2">{end.toLocaleDateString()}</td>
                        <td className={`px-3 py-2 font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysLeft} gün
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Yakın zamanda süresi dolacak plan bulunmuyor.</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Seçili Klinik İşlemleri</h2>
        {clinic ? (
          <div className="mt-4 grid gap-6">
            <div>
              <div className="text-sm"><span className="text-gray-600">Ad:</span> <span className="font-medium">{clinic.name}</span></div>
              <div className="text-sm"><span className="text-gray-600">Slug:</span> <span className="font-medium">{clinic.slug}</span></div>
            </div>
            <div className="rounded border p-4">
              <h3 className="font-medium">Plan Durumu</h3>
              {(() => {
                const cp = clinicPlans[0] || null;
                const end = cp?.endDate ? new Date(cp.endDate as any) : null;
                const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const status = cp?.isActive ? "Aktif" : "Pasif";
                const color = typeof daysLeft === "number" ? colorForDays(daysLeft) : "text-gray-700";
                return (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">Plan:</span> <span className="font-medium">{cp?.plan?.name || "-"}</span></div>
                    <div><span className="text-gray-600">Bitiş:</span> <span className="font-medium">{end ? end.toLocaleDateString() : "-"}</span></div>
                    <div className={color}><span className="text-gray-600">Kalan:</span> <span className="font-medium">{typeof daysLeft === "number" ? `${daysLeft} gün` : "-"}</span></div>
                    <div><span className="text-gray-600">Durum:</span> <span className="font-medium">{status}</span></div>
                  </div>
                );
              })()}
            </div>
            <div className="rounded border p-4">
              <h3 className="font-medium">Planı Değiştir</h3>
              <form action={updateActiveClinicPlanAction} className="mt-2 flex items-end gap-2">
                <select name="planId" className="rounded border px-3 py-2" required>
                  {(await prisma.plan.findMany({ orderBy: { createdAt: "desc" } })).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                  ))}
                </select>
                <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Kaydet</button>
              </form>
            </div>
            <div className="rounded border p-4">
              <h3 className="font-medium">Bitiş Tarihi / Durum</h3>
              {(() => {
                const cp = clinicPlans[0] || null;
                const end = cp?.endDate ? new Date(cp.endDate as any) : null;
                return (
                  <form action={updateActiveClinicPlanDatesAction} className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-700">Yeni Bitiş</label>
                      <input type="date" name="newEndDate" className="mt-1 w-full rounded border px-3 py-2" defaultValue={end ? end.toISOString().slice(0,10) : ""} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Durum</label>
                      <select name="newStatus" className="mt-1 w-full rounded border px-3 py-2" defaultValue={cp?.isActive ? "active" : "inactive"}>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Kaydet</button>
                    </div>
                  </form>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Seçili klinik bulunamadı. Klinikler sayfasından bir klinik seçin.</div>
        )}
      </div>
    </div>
  );
}
