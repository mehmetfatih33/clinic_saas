import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const featureOptions = [
  "core-clinic",
  "room-tracking",
  "accounting",
  "multi-user",
  "multi-room",
];

const featureLabels: Record<string, string> = {
  "core-clinic": "Temel Paket",
  "room-tracking": "Oda Takibi",
  "accounting": "Muhasebe",
  "multi-user": "Çoklu Klinik Kontrol",
  "multi-room": "Çoklu Oda",
};

async function createPlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = slugInput || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const features = formData.getAll("features").map(String);
  if (!name) return;
  await prisma.plan.create({ data: { name, slug, features } });
  revalidatePath("/admin/plans");
}

async function updatePlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = slugInput || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const features = formData.getAll("features").map(String);
  if (!id || !name) return;
  await prisma.plan.update({ where: { id }, data: { name, slug, features } });
  revalidatePath("/admin/plans");
}

async function deletePlanAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.plan.delete({ where: { id } });
  revalidatePath("/admin/plans");
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const sp = searchParams ? await searchParams : undefined;
  const editId = typeof sp?.edit === "string" ? sp?.edit : undefined;
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Plan Yönetimi</h1>
      <div className="mt-6 grid gap-6">
        {isSuperAdmin && (
          <div className="rounded-lg border bg-card text-card-foreground p-6">
            <h2 className="text-lg font-semibold">Yeni Plan Ekle</h2>
            <form action={createPlanAction} className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-foreground">Plan Adı</label>
                <input name="name" className="mt-1 w-full rounded border px-3 py-2" placeholder="Örn: Full" required />
              </div>
              <div>
                <label className="text-sm text-foreground">Slug</label>
                <input name="slug" className="mt-1 w-full rounded border px-3 py-2" placeholder="full" />
                <p className="mt-1 text-xs text-gray-500">Boş bırakılırsa ad’dan otomatik üretilir</p>
              </div>
              <div>
                <label className="text-sm text-foreground">Özellikler</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {featureOptions.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="features" value={f} className="h-4 w-4" />
                      <span>{featureLabels[f] ?? f}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Ekle</button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-lg border bg-card text-card-foreground p-6">
          <h2 className="text-lg font-semibold">Planlar</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">Plan Adı</th>
                  <th className="text-left px-4 py-2">Slug</th>
                  <th className="text-left px-4 py-2">Aylık Fiyat</th>
                  <th className="text-left px-4 py-2">Özellikler</th>
                  <th className="text-left px-4 py-2">Oluşturulma</th>
                  <th className="text-left px-4 py-2">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">Henüz plan oluşturulmamış</td>
                  </tr>
                ) : (
                  plans.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2">{p.slug}</td>
                      <td className="px-4 py-2">-</td>
                      <td className="px-4 py-2">{Array.isArray(p.features) ? (p.features as string[]).map((x) => featureLabels[x] ?? x).join(", ") : ""}</td>
                      <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-2">
                        {isSuperAdmin ? (
                          <div className="flex items-center gap-2">
                            <a href={`?edit=${p.id}`} className="rounded border px-3 py-1">Düzenle</a>
                            <form action={deletePlanAction}>
                              <input type="hidden" name="id" defaultValue={p.id} />
                              <button type="submit" className="rounded border px-3 py-1">Sil</button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-gray-400">Yetki yok</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isSuperAdmin && editId && (
          <div className="rounded-lg border bg-card text-card-foreground p-6">
            <h2 className="text-lg font-semibold">Plan Düzenle</h2>
            {plans.filter((x: any) => x.id === editId).map((p: any) => (
              <form key={p.id} action={updatePlanAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" defaultValue={p.id} />
                <div>
                  <label className="text-sm text-foreground">Plan Adı</label>
                  <input name="name" defaultValue={p.name} className="mt-1 w-full rounded border px-3 py-2" required />
                </div>
                <div>
                  <label className="text-sm text-foreground">Slug</label>
                  <input name="slug" defaultValue={p.slug} className="mt-1 w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-foreground">Özellikler</label>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {featureOptions.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="features" value={f} className="h-4 w-4" defaultChecked={Array.isArray(p.features) ? (p.features as string[]).includes(f) : false} />
                        <span>{featureLabels[f] ?? f}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Kaydet</button>
                  <a href="/admin/plans" className="rounded border px-4 py-2">İptal</a>
                </div>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
