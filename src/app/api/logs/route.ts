import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam || 100), 1), 1000);
    const logs = await prisma.auditLog.findMany({
      where: { clinicId: session.user.clinicId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ message: "Loglar yüklenemedi" }, { status: 500 });
  }
}
