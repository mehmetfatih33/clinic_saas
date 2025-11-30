import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const where: any = { clinicId: session.user.clinicId };
    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      const lte = to ? new Date(to) : undefined;
      where.date = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }
    const items = await prisma.cashTransaction.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("CashTransactions GET error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const body = await req.json();
    const { type, category, categoryId, amount, patientId, specialistId, description, date } = body as {
      type?: "IN" | "OUT";
      category?: "HASTA_ODEME" | "UZMAN_ODEME" | "MAAS" | "KIRA" | "DIGER_GIDER" | "DIGER_GELIR";
      categoryId?: string;
      amount?: number;
      patientId?: string;
      specialistId?: string;
      description?: string;
      date?: string;
    };

    if (!type || !["IN", "OUT"].includes(type) || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ message: "Geçersiz veri" }, { status: 400 });
    }

    if (patientId) {
      const pat = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.user.clinicId } });
      if (!pat) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });
    }
    if (specialistId) {
      const sp = await prisma.user.findFirst({ where: { id: specialistId, clinicId: session.user.clinicId } });
      if (!sp) return NextResponse.json({ message: "Uzman bulunamadı" }, { status: 404 });
    }

    let cashCategoryId: string | null = null;
    let enumCategory: any = category as any;
    if (categoryId) {
      const cat = await prisma.financeCategory.findFirst({ where: { id: categoryId, clinicId: session.user.clinicId } });
      if (!cat) return NextResponse.json({ message: "Kategori bulunamadı" }, { status: 404 });
      // Category type must match flow
      const catFlow = cat.type === "INCOME" ? "IN" : "OUT";
      if (catFlow !== type) return NextResponse.json({ message: "Kategori tipi uyumsuz" }, { status: 400 });
      cashCategoryId = cat.id;
      enumCategory = cat.type === "INCOME" ? "DIGER_GELIR" : "DIGER_GIDER";
    }
    const created = await prisma.cashTransaction.create({
      data: {
        clinicId: session.user.clinicId,
        type: type as any,
        category: enumCategory ?? (type === "IN" ? ("DIGER_GELIR" as any) : ("DIGER_GIDER" as any)),
        amount,
        patientId: patientId || null,
        specialistId: specialistId || null,
        cashCategoryId,
        description,
        date: date ? new Date(date) : undefined,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("CashTransactions POST error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
