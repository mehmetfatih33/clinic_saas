// src/lib/authz.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma"; // TODO: Enable when database is connected

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function ensureRole(session: { user?: { role?: string } }, roles: Array<"ADMIN"|"ASISTAN"|"UZMAN">) {
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (!roles.includes(session.user.role as "ADMIN"|"ASISTAN"|"UZMAN")) throw new Error("FORBIDDEN");
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