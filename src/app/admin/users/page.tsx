import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { Filter, KeyRound, ShieldCheck, Users2 } from "lucide-react";

const roleOptions: Role[] = ["SUPER_ADMIN", "ADMIN", "ASISTAN", "UZMAN", "PERSONEL"];

async function changeUserRoleAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") return;
  const userId = String(formData.get("userId") || "").trim();
  const newRoleStr = String(formData.get("newRole") || "").trim() as Role;
  if (!userId || !newRoleStr) return;
  if (!roleOptions.includes(newRoleStr)) return;
  if (session.user.id === userId) return;
  await prisma.user.update({ where: { id: userId }, data: { role: newRoleStr } });
  revalidatePath("/admin/users");
  redirect("/admin/users?roleChanged=1");
}

async function resetUserPasswordAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") return;
  const userId = String(formData.get("userId") || "").trim();
  if (!userId) return;
  console.log(`[Dummy] Password reset triggered for user ${userId}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?passwordReset=1");
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const sp = searchParams ? await searchParams : undefined;
  const roleFilter = typeof sp?.role === "string" ? sp?.role : "";
  const clinicFilter = typeof sp?.clinicId === "string" ? sp?.clinicId : "";
  const roleChanged = sp?.roleChanged === "1";
  const passwordReset = sp?.passwordReset === "1";

  const clinics = await prisma.clinic.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter as Role } : {}),
      ...(clinicFilter ? { clinicId: clinicFilter } : {}),
    },
    orderBy: { name: "asc" },
    include: { clinic: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Access</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Kullanici yonetimi</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Roller, klinik baglantilari ve temel hesap islemlerini buradan yonet.
        </p>
      </div>

      {(roleChanged || passwordReset) && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          {roleChanged ? "Rol guncellendi" : "Parola sifirlama islemi tetiklendi (dummy)"}
        </div>
      )}

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Filters</div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Filtre</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Filter className="h-5 w-5" />
          </div>
        </div>

        <form method="GET" className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Rol</label>
            <select
              name="role"
              defaultValue={roleFilter}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="">Tumu</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Klinik</label>
            <select
              name="clinicId"
              defaultValue={clinicFilter}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="">Tumu</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Filtrele
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Directory</div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Kullanicilar</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Users2 className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Ad Soyad</th>
                <th className="px-4 py-3 text-left font-semibold">E-posta</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="px-4 py-3 text-left font-semibold">Klinik</th>
                <th className="px-4 py-3 text-left font-semibold">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Kullanici bulunamadi
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-4 font-semibold text-slate-900">{u.name || "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{u.email}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{u.clinic?.name || "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <form action={changeUserRoleAction} className="flex flex-1 items-center gap-2">
                          <input type="hidden" name="userId" defaultValue={u.id} />
                          <select
                            name="newRole"
                            defaultValue={u.role}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Rol
                          </button>
                        </form>
                        <form action={resetUserPasswordAction}>
                          <input type="hidden" name="userId" defaultValue={u.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:w-auto"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                            Parola
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
