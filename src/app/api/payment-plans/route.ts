import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const body = await req.json();
    const { type, amount, dueDate, description, patientId, specialistId } = body as {
      type: "INCOMING" | "OUTGOING";
      amount: number;
      dueDate: string;
      description?: string;
      patientId?: string;
      specialistId?: string;
    };

    if (!type || !["INCOMING", "OUTGOING"].includes(type)) {
      return NextResponse.json({ message: "Geçerli bir plan türü gerekli" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: "Geçerli bir tutar girin" }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ message: "Vade tarihi gerekli" }, { status: 400 });
    }

    if (patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.user.clinicId } });
      if (!patient) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });
    }
    if (specialistId) {
      const specialist = await prisma.user.findFirst({ where: { id: specialistId, clinicId: session.user.clinicId } });
      if (!specialist) return NextResponse.json({ message: "Uzman bulunamadı" }, { status: 404 });
    }

    const created = await prisma.paymentPlan.create({
      data: {
        clinicId: session.user.clinicId,
        type: type as any,
        amount,
        dueDate: new Date(dueDate),
        description,
        patientId: patientId || null,
        specialistId: specialistId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: "PAYMENT_PLAN_CREATE",
        entity: "PaymentPlan",
        entityId: created.id,
        meta: {
          type,
          amount,
          dueDate,
          patientId: patientId || null,
          specialistId: specialistId || null,
          message: `Ödeme planı oluşturuldu: ${type === "INCOMING" ? "Gelecek Gelir" : "Gelecek Gider"}, ${amount.toLocaleString("tr-TR")} ₺, vade ${new Date(dueDate).toLocaleDateString("tr-TR")}`,
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("❌ Plan create error:", err);
    return NextResponse.json({ message: "Plan oluşturulamadı" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = { clinicId: session.user.clinicId };
    if (status && ["PLANNED", "PAID", "CANCELED"].includes(status)) where.status = status;
    if (session.user.role === "UZMAN") where.specialistId = session.user.id;

    const plans = await prisma.paymentPlan.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    });
    return NextResponse.json(plans);
  } catch (err: any) {
    console.error("❌ Plan list error:", err);
    return NextResponse.json({ message: "Planlar yüklenemedi" }, { status: 500 });
  }
}
