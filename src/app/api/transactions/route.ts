import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const { type, amount, description, patientId, specialistId, date } = body as {
      type: "INCOME" | "EXPENSE";
      amount: number;
      description?: string;
      patientId?: string;
      specialistId?: string;
      date?: string;
    };

    if (!type || !["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ message: "Geçerli bir işlem türü gerekli" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: "Geçerli bir tutar girin" }, { status: 400 });
    }

    // Optional foreign keys must belong to the same clinic
    if (patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.user.clinicId } });
      if (!patient) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });
    }
    if (specialistId) {
      const specialist = await prisma.user.findFirst({ where: { id: specialistId, clinicId: session.user.clinicId } });
      if (!specialist) return NextResponse.json({ message: "Uzman bulunamadı" }, { status: 404 });
    }

    const created = await prisma.transaction.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: patientId || null,
        specialistId: specialistId || null,
        type: type as any,
        amount,
        description,
        date: date ? new Date(date) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: "TRANSACTION_CREATE",
        entity: "Transaction",
        entityId: created.id,
        meta: {
          type,
          amount,
          patientId: patientId || null,
          specialistId: specialistId || null,
          message: `${type === "INCOME" ? "Gelir" : "Gider"} eklendi: ${amount.toLocaleString("tr-TR")} ₺`,
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("❌ Transaction create error:", err);
    return NextResponse.json({ message: "İşlem kaydedilemedi" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const specialistId = searchParams.get("specialistId");
    const type = searchParams.get("type");

    const where: any = { clinicId: session.user.clinicId };
    if (patientId) where.patientId = patientId;
    if (specialistId) where.specialistId = specialistId;
    if (type && ["INCOME", "EXPENSE"].includes(type)) where.type = type;

    const list = await prisma.transaction.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json(list);
  } catch (err: any) {
    console.error("❌ Transaction list error:", err);
    return NextResponse.json({ message: "İşlemler yüklenemedi" }, { status: 500 });
  }
}
