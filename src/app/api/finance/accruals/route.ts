import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const specialistIdFilter = searchParams.get("specialistId");

    const wherePayments: any = { clinicId: session.user.clinicId };
    if (specialistIdFilter) wherePayments.specialistId = specialistIdFilter;
    if (monthStr && yearStr) {
      const month = Number(monthStr);
      const year = Number(yearStr);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      wherePayments.createdAt = { gte: start, lte: end };
    } else if (yearStr) {
      const year = Number(yearStr);
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      wherePayments.createdAt = { gte: start, lte: end };
    }

    const paymentGroups = await prisma.payment.groupBy({
      by: ["specialistId"],
      where: wherePayments,
      _sum: { specialistCut: true },
    });

    const wherePayouts: any = { clinicId: session.user.clinicId, type: "SPECIALIST" };
    if (specialistIdFilter) wherePayouts.targetUserId = specialistIdFilter;
    if (monthStr && yearStr) {
      wherePayouts.date = {
        gte: new Date(Number(yearStr), Number(monthStr) - 1, 1),
        lte: new Date(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999),
      };
    } else if (yearStr) {
      wherePayouts.date = {
        gte: new Date(Number(yearStr), 0, 1),
        lte: new Date(Number(yearStr), 11, 31, 23, 59, 59, 999),
      };
    }

    const payoutGroups = await prisma.payout.groupBy({
      by: ["targetUserId"],
      where: wherePayouts,
      _sum: { amount: true },
    });

    const specialists = await prisma.user.findMany({
      where: { clinicId: session.user.clinicId, role: "UZMAN" },
      select: { id: true, name: true },
    });

    const payoutMap = new Map<string, number>();
    payoutGroups.forEach((g: { targetUserId: string; _sum: { amount: number | null } }) =>
      payoutMap.set(g.targetUserId, g._sum.amount || 0)
    );

    const items = paymentGroups.map((g: { specialistId: string; _sum: { specialistCut: number | null } }) => {
      const paidOut = payoutMap.get(g.specialistId) || 0;
      const accrued = g._sum.specialistCut || 0;
      return {
        specialistId: g.specialistId,
        specialistName: specialists.find((s) => s.id === g.specialistId)?.name || "",
        accrued,
        paidOut,
        balance: accrued - paidOut,
      };
    });

    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ message: "Accruals yüklenemedi" }, { status: 500 });
  }
}
