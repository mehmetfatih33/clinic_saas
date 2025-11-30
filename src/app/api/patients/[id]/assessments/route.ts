import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AssessmentType } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: patientId } = await context.params;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: session.user.clinicId },
      select: { assignedToId: true },
    });
    if (!patient) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });

    if (session.user.role === "UZMAN" && patient.assignedToId !== session.user.id) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 403 });
    }

    const list = await prisma.assessment.findMany({
      where: { clinicId: session.user.clinicId, patientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(list);
  } catch (err) {
    return NextResponse.json({ message: "Değerlendirmeler yüklenemedi" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: patientId } = await context.params;
    const body = await req.json();
    const { type, answers } = body as { type: AssessmentType; answers: number[] };

    if (!type || !Array.isArray(answers)) {
      return NextResponse.json({ message: "Eksik veri" }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: session.user.clinicId },
      select: { assignedToId: true },
    });
    if (!patient) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });

    if (session.user.role === "UZMAN" && patient.assignedToId !== session.user.id) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 403 });
    }

    const expectedLen = type === "PHQ9" ? 9 : 7;
    if (answers.length !== expectedLen) {
      return NextResponse.json({ message: "Yanıt sayısı geçersiz" }, { status: 400 });
    }
    const total = answers.reduce((a, b) => a + Number(b || 0), 0);

    const created = await prisma.assessment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        specialistId: session.user.id,
        type,
        answers,
        total,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: "Değerlendirme kaydedilemedi" }, { status: 500 });
  }
}
