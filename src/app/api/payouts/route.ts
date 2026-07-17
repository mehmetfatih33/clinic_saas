import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole, requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const body = await req.json();
    const { type, targetUserId, amount, category, note, periodMonth, periodYear, date } = body as {
      type: "SPECIALIST" | "STAFF";
      targetUserId: string;
      amount: number;
      category?: "SALARY" | "BONUS" | "OTHER";
      note?: string;
      periodMonth?: number;
      periodYear?: number;
      date?: string;
    };

    if (!type || !["SPECIALIST", "STAFF"].includes(type)) return NextResponse.json({ message: "Geçersiz tür" }, { status: 400 });
    if (!targetUserId) return NextResponse.json({ message: "Kullanıcı gerekli" }, { status: 400 });
    if (!amount || isNaN(amount) || amount <= 0) return NextResponse.json({ message: "Geçersiz tutar" }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { id: targetUserId, clinicId: session.user.clinicId } });
    if (!user) return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });

    if (type === "SPECIALIST" && user.role !== "UZMAN") {
      return NextResponse.json({ message: "Uzman odemesi icin hedef kullanici uzman olmali" }, { status: 400 });
    }

    if (type === "STAFF" && user.role === "UZMAN") {
      return NextResponse.json({ message: "Personel odemesi icin uzman secilemez" }, { status: 400 });
    }

    const payoutDate = date ? new Date(date) : undefined;
    if (payoutDate && Number.isNaN(payoutDate.getTime())) {
      return NextResponse.json({ message: "Gecersiz tarih" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          clinicId: session.user.clinicId,
          targetUserId,
          type: type as any,
          category: category ? (category as any) : null,
          amount,
          note,
          periodMonth: periodMonth || null,
          periodYear: periodYear || null,
          date: payoutDate,
        },
      });

      await tx.cashTransaction.create({
        data: {
          clinicId: session.user.clinicId,
          type: "OUT",
          category: type === "STAFF" && category === "SALARY" ? "MAAS" : "UZMAN_ODEME",
          amount,
          specialistId: type === "SPECIALIST" ? targetUserId : null,
          description: type === "STAFF" ? "Maaş/Çalışan ödemesi" : "Uzman hakediş ödemesi",
          date: payoutDate,
        },
      });

      await tx.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PAYOUT_CREATE",
          entity: "Payout",
          entityId: payout.id,
          meta: {
            type,
            targetUserId,
            amount,
            category: category || null,
            message: `${type === "STAFF" ? (category === "SALARY" ? "Maaş" : "Çalışan ödemesi") : "Uzman hakediş ödemesi"}: ${amount.toLocaleString("tr-TR")} ₺`,
          },
        },
      });

      return payout;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giris gerekli" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Bu islemi yapma yetkiniz yok" }, { status: 403 });
    }
    return NextResponse.json({ message: "Ödeme kaydı oluşturulamadı" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const isUzman = session.user.role === "UZMAN";
    const targetUserId = isUzman ? session.user.id : searchParams.get("userId");

    const where: any = { clinicId: session.user.clinicId };
    if (isUzman) {
      where.type = "SPECIALIST";
    } else if (type && ["SPECIALIST", "STAFF"].includes(type)) {
      where.type = type;
    }
    if (targetUserId) where.targetUserId = targetUserId;
    if (monthStr && yearStr) {
      const start = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const end = new Date(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (yearStr) {
      const start = new Date(Number(yearStr), 0, 1);
      const end = new Date(Number(yearStr), 11, 31, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const list = await prisma.payout.findMany({
      where,
      include: { target: { select: { id: true, name: true, role: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
    return NextResponse.json(list);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giris gerekli" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Bu listeye erisim yetkiniz yok" }, { status: 403 });
    }
    return NextResponse.json({ message: "Ödeme kayıtları yüklenemedi" }, { status: 500 });
  }
}
