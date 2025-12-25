import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where: any = { clinicId: session.user.clinicId };
    if (type && ["INCOME", "EXPENSE"].includes(type)) where.type = type;
    const items = await prisma.financeTransaction.findMany({
      where,
      include: {
        account: true,
        category: true,
        staff: { select: { id: true, name: true, role: true } },
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("FinanceTransaction GET error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const body = await req.json();
    const { amount, type, date, description, accountId, categoryId, staffId, patientId } = body as {
      amount?: number;
      type?: "INCOME" | "EXPENSE";
      date?: string;
      description?: string;
      accountId?: string;
      categoryId?: string;
      staffId?: string;
      patientId?: string;
    };
    if (!amount || isNaN(amount) || amount <= 0 || !type || !["INCOME", "EXPENSE"].includes(type) || !date) {
      return NextResponse.json({ message: "Geçersiz veri" }, { status: 400 });
    }
    // Foreign key ownership checks
    if (accountId) {
      const acc = await prisma.financeAccount.findFirst({ where: { id: accountId, clinicId: session.user.clinicId } });
      if (!acc) return NextResponse.json({ message: "Hesap bulunamadı" }, { status: 404 });
    }
    if (categoryId) {
      const cat = await prisma.financeCategory.findFirst({ where: { id: categoryId, clinicId: session.user.clinicId } });
      if (!cat) return NextResponse.json({ message: "Kategori bulunamadı" }, { status: 404 });
    }
    if (staffId) {
      const staff = await prisma.user.findFirst({ where: { id: staffId, clinicId: session.user.clinicId } });
      if (!staff) return NextResponse.json({ message: "Personel bulunamadı" }, { status: 404 });
    }
    if (patientId) {
      const pat = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.user.clinicId } });
      if (!pat) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });
    }

    const created = await prisma.financeTransaction.create({
      data: {
        clinicId: session.user.clinicId,
        amount,
        type: type as any,
        date: new Date(date),
        description,
        accountId: accountId || null,
        categoryId: categoryId || null,
        staffId: staffId || null,
        patientId: patientId || null,
        createdById: session.user.id,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "TRANSACTION_CREATE",
          entity: "FinanceTransaction",
          entityId: created.id,
          meta: {
            type,
            amount,
            description,
            message: `${type === "INCOME" ? "Gelir" : "Gider"} kaydedildi: ${amount.toLocaleString("tr-TR")} ₺`,
          },
        },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("FinanceTransaction POST error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

