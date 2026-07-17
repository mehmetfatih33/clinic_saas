import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CheckCircle2, Layers3, PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";

const featureOptions = [
  "core-clinic",
  "room-tracking",
  "accounting",
  "multi-user",
  "multi-room",
  "analytics",
  "documents",
  "prescriptions",
  "tasks",
];

const featureLabels: Record<string, string> = {
  "core-clinic": "Temel Paket",
  "room-tracking": "Oda Takibi",
  "accounting": "Muhasebe",
  "multi-user": "Çoklu Klinik Kontrol",
  "multi-room": "Çoklu Oda",
  "analytics": "Raporlar",
  "documents": "Dokümanlar",
  "prescriptions": "Reçeteler",
  "tasks": "Görevler",
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
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Plans</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Plan yonetimi</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Paketleri olustur, ozellik setlerini duzenle ve kliniklere atanacak planlari kontrol et.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {isSuperAdmin && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Create</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Yeni plan</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Plus className="h-5 w-5" />
              </div>
            </div>

            <form action={createPlanAction} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700">Plan adi</label>
                <input
                  name="name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Orn: Full"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Slug</label>
                <input
                  name="slug"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="full"
                />
                <p className="mt-2 text-xs text-slate-500">Bos birakilirsa ad’dan otomatik uretilir</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Ozellikler</label>
                <div className="mt-3 grid gap-2">
                  {featureOptions.map((f) => (
                    <label
                      key={f}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" name="features" value={f} className="h-4 w-4" />
                        <span className="font-medium">{featureLabels[f] ?? f}</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-slate-400" />
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4" />
                Ekle
              </button>
            </form>
          </div>
        )}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Directory</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Planlar</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Layers3 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold">Slug</th>
                  <th className="px-4 py-3 text-left font-semibold">Ozellikler</th>
                  <th className="px-4 py-3 text-left font-semibold">Olusturulma</th>
                  <th className="px-4 py-3 text-left font-semibold">Islemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Henuz plan olusturulmamis
                    </td>
                  </tr>
                ) : (
                  plans.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-4 py-4 text-slate-700">{p.slug}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {Array.isArray(p.features)
                          ? (p.features as string[]).map((x) => featureLabels[x] ?? x).join(", ")
                          : ""}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {new Date(p.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        {isSuperAdmin ? (
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <a
                              href={`?edit=${p.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <PencilLine className="h-3.5 w-3.5 text-slate-500" />
                              Duzenle
                            </a>
                            <form action={deletePlanAction}>
                              <input type="hidden" name="id" defaultValue={p.id} />
                              <button
                                type="submit"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 md:w-auto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Sil
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-slate-400">Yetki yok</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isSuperAdmin && editId && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Edit</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Plan duzenle</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <PencilLine className="h-5 w-5" />
            </div>
          </div>

          {plans
            .filter((x: any) => x.id === editId)
            .map((p: any) => (
              <form key={p.id} action={updatePlanAction} className="mt-6 grid gap-4">
                <input type="hidden" name="id" defaultValue={p.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Plan adi</label>
                    <input
                      name="name"
                      defaultValue={p.name}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Slug</label>
                    <input
                      name="slug"
                      defaultValue={p.slug}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Ozellikler</label>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {featureOptions.map((f) => (
                      <label
                        key={f}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            name="features"
                            value={f}
                            className="h-4 w-4"
                            defaultChecked={Array.isArray(p.features) ? (p.features as string[]).includes(f) : false}
                          />
                          <span className="font-medium">{featureLabels[f] ?? f}</span>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Kaydet
                  </button>
                  <a
                    href="/admin/plans"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Iptal
                  </a>
                </div>
              </form>
            ))}
        </div>
      )}
    </div>
  );
}
