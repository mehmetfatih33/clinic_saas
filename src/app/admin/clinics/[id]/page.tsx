import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hash } from "bcryptjs";

async function changeClinicPlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const planId = String(formData.get("planId") || "").trim();
  if (!clinicId || !planId) return;
  const c = await cookies();
  const activeClinicId = c.get("active_clinic_id")?.value || "";
  if (clinicId !== activeClinicId) return;

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
    <div>
      <h1 className="text-2xl font-semibold">Klinik Detayı</h1>

      {changed && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">Plan başarıyla güncellendi</div>
      )}
      {credsChanged && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">Admin bilgileri güncellendi</div>
      )}
      {!!credsError && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{credsError}</div>
      )}

      <div className="mt-6 grid gap-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Bilgiler</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-600">Klinik Adı:</span> <span className="font-medium">{clinic?.name}</span></div>
            <div><span className="text-gray-600">Slug:</span> <span className="font-medium">{clinic?.slug}</span></div>
            <div><span className="text-gray-600">Admin E‑posta:</span> <span className="font-medium">{adminEmail}</span></div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Aktif Plan</h2>
          <div className="mt-3 text-sm">
            <div><span className="text-gray-600">Plan Adı:</span> <span className="font-medium">{activePlan?.name || "-"}</span></div>
            <div><span className="text-gray-600">Özellikler:</span> <span className="font-medium">{Array.isArray(activePlan?.features) ? (activePlan?.features as string[]).join(", ") : ""}</span></div>
            <div><span className="text-gray-600">Başlangıç:</span> <span className="font-medium">{startDate ? new Date(startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span></div>
            <div><span className="text-gray-600">Bitiş:</span> <span className="font-medium">{endDate ? new Date(endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span></div>
            <div><span className="text-gray-600">Durum:</span> <span className="font-medium">{isActive ? "Aktif" : "Pasif"}</span></div>
          </div>
          {activePlan?.id && (
            <div className="mt-3">
              <a href={`/admin/plans?edit=${activePlan.id}`} className="rounded border px-3 py-1">Planı Düzenle</a>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Plan Değiştir</h2>
          <form action={changeClinicPlanAction} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="hidden" name="clinicId" defaultValue={clinicId} />
            <div>
              <label className="text-sm text-gray-700">Yeni Plan</label>
              <select name="planId" className="mt-1 w-full rounded border px-3 py-2" required defaultValue={activePlan?.id || ""}>
                <option value="" disabled>Plan seçin</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Plan Değiştir</button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Bitiş Tarihi / Durum Düzenle</h2>
          <form action={updateClinicPlanDatesAction} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="hidden" name="clinicId" defaultValue={clinicId} />
            <div>
              <label className="text-sm text-gray-700">Yeni Bitiş Tarihi</label>
              <input type="date" name="newEndDate" className="mt-1 w-full rounded border px-3 py-2" defaultValue={endDate ? new Date(endDate as any).toISOString().slice(0,10) : ""} />
            </div>
            <div>
              <label className="text-sm text-gray-700">Durum</label>
              <select name="newStatus" className="mt-1 w-full rounded border px-3 py-2" defaultValue={isActive ? "active" : "inactive"}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Kaydet</button>
            </div>
            <p className="md:col-span-2 text-xs text-gray-500">Sadece SUPER_ADMIN güncelleyebilir.</p>
          </form>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Admin Bilgileri Güncelle</h2>
          <form action={updateClinicAdminCredentialsAction} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="hidden" name="clinicId" defaultValue={clinicId} />
            <input type="hidden" name="adminUserId" defaultValue={adminUser?.id || ""} />
            <div>
              <label className="text-sm text-gray-700">Yeni E‑posta</label>
              <input name="newEmail" defaultValue={adminEmail !== "-" ? adminEmail : ""} className="mt-1 w-full rounded border px-3 py-2" placeholder="admin@example.com" />
            </div>
            <div>
              <label className="text-sm text-gray-700">Yeni Şifre</label>
              <input type="password" name="newPassword" className="mt-1 w-full rounded border px-3 py-2" placeholder="En az 6 karakter" />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Admin Bilgilerini Güncelle</button>
            </div>
          </form>
          <p className="mt-2 text-xs text-gray-500">Sadece SUPER_ADMIN bu işlemi yapabilir.</p>
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

async function updateClinicPlanDatesAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const clinicId = String(formData.get("clinicId") || "").trim();
  const newEndDateStr = String(formData.get("newEndDate") || "").trim();
  const newStatus = String(formData.get("newStatus") || "").trim();
  if (!clinicId) return;
  const c = await cookies();
  const activeClinicId = c.get("active_clinic_id")?.value || "";
  if (clinicId !== activeClinicId) return;
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
