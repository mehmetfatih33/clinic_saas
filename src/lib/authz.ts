// src/lib/authz.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
// import { prisma } from "@/lib/prisma"; // TODO: Enable when database is connected

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHORIZED");
  try {
    const c = await cookies();
    const active = c.get("active_clinic_id")?.value;
    if (active) {
      if (session.user.role === "SUPER_ADMIN") {
        session.user.clinicId = active;
      } else if (Array.isArray(session.user.clinicIds) && session.user.clinicIds.includes(active)) {
        session.user.clinicId = active;
      }
    }
    if (!Array.isArray(session.user.clinicIds) || session.user.clinicIds.length === 0) {
      session.user.clinicIds = [session.user.clinicId];
    }
  } catch {}
  return session;
}

export function ensureRole(session: { user?: { role?: string } }, roles: Array<"SUPER_ADMIN"|"ADMIN"|"ASISTAN"|"UZMAN"|"PERSONEL">) {
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (session.user.role === "SUPER_ADMIN") return;
  if (!roles.includes(session.user.role as any)) throw new Error("FORBIDDEN");
}

export async function canReadAssignment(session: { user?: { role?: string; clinicId?: string; id?: string } }, _assignmentId: string) {
  if (!session?.user) return false;
  // TODO: Implement when database is connected
  // admin & asistan -> tümünü görebilir (kendi kliniği)
  // uzman -> sadece kendi ataması
  return true; // placeholder
}

export async function canWritePrivateNote(session: { user?: { role?: string; clinicId?: string; id?: string } }, _assignmentId: string) {
  if (!session?.user) return false;
  // TODO: Implement when database is connected
  // admin can write, uzman can write for own assignments
  // asistan cannot write
  return session.user.role !== "ASISTAN"; // placeholder
}
