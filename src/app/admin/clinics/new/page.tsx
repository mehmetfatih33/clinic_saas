import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import Link from "next/link";
import { hasFeature } from "@/lib/features";

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
    <div>
      <h1 className="text-2xl font-semibold">Yeni Klinik Oluştur</h1>
      <div className="mt-6 rounded-lg border bg-white p-6">
        {!!error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
        )}
        <form action={createClinicWithPlanAction} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Klinik Bilgileri</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Klinik Adı</label>
                <input name="clinicName" className="mt-1 w-full rounded border px-3 py-2" required />
              </div>
              <div>
                <label className="text-sm text-gray-700">Slug</label>
                <input name="clinicSlug" className="mt-1 w-full rounded border px-3 py-2" placeholder="otomatik üretilebilir" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Klinik Admin Bilgileri</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Ad Soyad</label>
                <input name="adminName" className="mt-1 w-full rounded border px-3 py-2" required />
              </div>
              <div>
                <label className="text-sm text-gray-700">E‑posta</label>
                <input type="email" name="adminEmail" className="mt-1 w-full rounded border px-3 py-2" required />
              </div>
              <div>
                <label className="text-sm text-gray-700">Şifre</label>
                <input type="password" name="adminPassword" className="mt-1 w-full rounded border px-3 py-2" required />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Plan ve Süre Seçimi</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Plan</label>
                <select name="planId" className="mt-1 w-full rounded border px-3 py-2" required defaultValue="">
                  <option value="" disabled>Plan seçin</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Abonelik Süresi</label>
                <div className="mt-1 flex gap-2">
                  <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="duration" value="15_DAYS" defaultChecked />
                    <span className="text-sm">15 Gün (Ücretsiz)</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="duration" value="1_MONTH" />
                    <span className="text-sm">1 Ay</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="duration" value="1_YEAR" />
                    <span className="text-sm">1 Yıl</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Oluştur</button>
            <Link href="/admin/clinics" className="rounded border px-4 py-2">İptal</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
