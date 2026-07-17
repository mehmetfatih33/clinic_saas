import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureEntityInClinic, ensureRole, ensureUserInClinic, requireSession } from "@/lib/authz";

export async function GET() {
  const session = await requireSession();
  
  try {
    const assignments = await prisma.assignment.findMany({
      where: { clinicId: session.user.clinicId },
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
        fee: { select: { id: true, title: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("❌ Assignment listesi yüklenemedi:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  ensureRole(session, ["ADMIN", "ASISTAN"]);
  const data = await req.json();

  try {
    await ensureEntityInClinic("patient", data.patientId, session.user.clinicId);
    await ensureUserInClinic(data.specialistId, session.user.clinicId, ["UZMAN"]);

    if (data.feeId) {
      await ensureEntityInClinic("feeSchedule", data.feeId, session.user.clinicId);
    }

    const assignment = await prisma.assignment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: data.patientId,
        specialistId: data.specialistId,
        feeId: data.feeId ?? null,
        customAmount: data.customAmount || null,
        splitClinic: data.splitClinic ?? 50,
        splitDoctor: data.splitDoctor ?? 50,
        status: "active",
      },
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
        fee: { select: { id: true, title: true, amount: true } },
      },
    });
    
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("❌ Assignment oluşturulamadı:", error);
    if (error instanceof Error && ["ENTITY_NOT_IN_CLINIC", "USER_NOT_IN_CLINIC"].includes(error.message)) {
      return NextResponse.json(
        { message: "Secilen kayitlar bu klinige ait degil." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Assignment kaydedilemedi", error: String(error) },
      { status: 500 }
    );
  }
}
