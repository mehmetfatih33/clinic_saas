import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "ASISTAN" | "UZMAN" | "PERSONEL";

type SessionLike = {
  user?: {
    id?: string;
    role?: AppRole | string;
    clinicId?: string;
    clinicIds?: string[];
  };
};

type ClinicScopedModel =
  | "appointment"
  | "assignment"
  | "clinic"
  | "feeSchedule"
  | "patient"
  | "room"
  | "user";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHORIZED");

  const clinicIds = Array.isArray(session.user.clinicIds)
    ? [...new Set(session.user.clinicIds.filter(Boolean))]
    : [];

  if (session.user.clinicId && !clinicIds.includes(session.user.clinicId)) {
    clinicIds.push(session.user.clinicId);
  }

  session.user.clinicIds = clinicIds;

  try {
    const c = await cookies();
    const active = c.get("active_clinic_id")?.value;
    if (active && clinicIds.includes(active)) {
      session.user.clinicId = active;
    }
  } catch {
    // ignore cookie access failures and fall back to token clinic
  }

  return session;
}

export async function requireRole(roles: AppRole[]) {
  const session = await requireSession();
  ensureRole(session, roles);
  return session;
}

export function ensureRole(session: SessionLike, roles: AppRole[]) {
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (session.user.role === "SUPER_ADMIN") return;
  if (!roles.includes(session.user.role as any)) throw new Error("FORBIDDEN");
}

export function getActiveClinicCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function ensureEntityInClinic(
  model: ClinicScopedModel,
  id: string,
  clinicId: string,
) {
  let entity: { id: string } | null = null;

  switch (model) {
    case "appointment":
      entity = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    case "assignment":
      entity = await prisma.assignment.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    case "clinic":
      entity =
        id === clinicId
          ? await prisma.clinic.findFirst({ where: { id }, select: { id: true } })
          : null;
      break;
    case "feeSchedule":
      entity = await prisma.feeSchedule.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    case "patient":
      entity = await prisma.patient.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    case "room":
      entity = await prisma.room.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    case "user":
      entity = await prisma.user.findFirst({ where: { id, clinicId }, select: { id: true } });
      break;
    default:
      entity = null;
  }

  if (!entity) {
    throw new Error("ENTITY_NOT_IN_CLINIC");
  }

  return entity;
}

export async function ensureUserInClinic(
  id: string,
  clinicId: string,
  roles?: AppRole[],
) {
  const user = await prisma.user.findFirst({
    where: {
      id,
      clinicId,
      ...(roles?.length ? { role: { in: roles } } : {}),
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_IN_CLINIC");
  }

  return user;
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
