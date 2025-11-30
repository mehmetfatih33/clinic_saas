import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const where: any = { clinicId: session.user.clinicId };
    if (staffId) where.staffId = staffId;
    const items = await prisma.payrollEntry.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        transaction: true,
      },
      orderBy: { periodStart: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("Payroll GET error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN"]);
    const body = await req.json();
    const { staffId, periodStart, periodEnd, grossAmount, netAmount, status } = body as {
      staffId?: string;
      periodStart?: string;
      periodEnd?: string;
      grossAmount?: number;
      netAmount?: number;
      status?: "PLANNED" | "PAID";
    };
    if (!staffId || !periodStart || !periodEnd || !grossAmount || isNaN(grossAmount) || grossAmount <= 0) {
      return NextResponse.json({ message: "Geçersiz veri" }, { status: 400 });
    }
    const staff = await prisma.user.findFirst({ where: { id: staffId, clinicId: session.user.clinicId } });
    if (!staff) return NextResponse.json({ message: "Personel bulunamadı" }, { status: 404 });
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ message: "Geçersiz dönem" }, { status: 400 });
    }
    const created = await prisma.payrollEntry.create({
      data: {
        clinicId: session.user.clinicId,
        staffId,
        periodStart: start,
        periodEnd: end,
        grossAmount,
        netAmount: typeof netAmount === "number" ? netAmount : grossAmount,
        status: (status as any) || "PLANNED",
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Payroll POST error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

