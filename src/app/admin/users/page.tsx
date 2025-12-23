import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

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
    <div>
      <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>

      {(roleChanged || passwordReset) && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">
          {roleChanged ? "Rol güncellendi" : "Parola sıfırlama işlemi tetiklendi (dummy)"}
        </div>
      )}

      <div className="mt-6 rounded-lg border bg-white p-6">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-700">Rol</label>
            <select name="role" defaultValue={roleFilter} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">Tümü</option>
              {roleOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Klinik</label>
            <select name="clinicId" defaultValue={clinicFilter} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">Tümü</option>
              {clinics.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="rounded bg-primary hover:bg-primary/90 px-4 py-2 text-white">Filtrele</button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2">Ad Soyad</th>
                <th className="text-left px-4 py-2">E‑posta</th>
                <th className="text-left px-4 py-2">Rol</th>
                <th className="text-left px-4 py-2">Klinik</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-left px-4 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Kullanıcı bulunamadı</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.name || "-"}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">{u.clinic?.name || "-"}</td>
                    <td className="px-4 py-2">-</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <form action={changeUserRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" defaultValue={u.id} />
                          <select name="newRole" defaultValue={u.role} className="rounded border px-2 py-1">
                            {roleOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                          </select>
                          <button type="submit" className="rounded border px-3 py-1">Rolü Güncelle</button>
                        </form>
                        <form action={resetUserPasswordAction}>
                          <input type="hidden" name="userId" defaultValue={u.id} />
                          <button type="submit" className="rounded border px-3 py-1">Parola Sıfırla</button>
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
