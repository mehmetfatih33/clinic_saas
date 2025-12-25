import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, []);
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const clinicNameParam = searchParams.get("clinicName");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const limit = Math.min(Math.max(Number(limitParam || 100), 1), 1000);
    
    const where: any = {};

    // Role check for filtering
    if (session.user.role === "SUPER_ADMIN") {
      if (clinicNameParam) {
        where.clinic = { name: { contains: clinicNameParam, mode: 'insensitive' } };
      }
    } else {
      where.clinicId = session.user.clinicId;
    }

    // Date filtering
    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        where.createdAt.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { 
        actor: { select: { id: true, name: true, email: true } },
        clinic: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ message: "Loglar yüklenemedi" }, { status: 500 });
  }
}
