import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

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
    const assignment = await prisma.assignment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: data.patientId,
        specialistId: data.specialistId,
        feeId: data.feeId,
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
    return NextResponse.json(
      { message: "Assignment kaydedilemedi", error: String(error) },
      { status: 500 }
    );
  }
}