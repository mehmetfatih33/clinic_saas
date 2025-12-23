import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET() {
  const session = await requireSession();
  const ids = Array.isArray(session.user.clinicIds) ? session.user.clinicIds : [session.user.clinicId];
  const clinics = await prisma.clinic.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } });
  return NextResponse.json({ items: clinics, activeClinicId: session.user.clinicId });
}
