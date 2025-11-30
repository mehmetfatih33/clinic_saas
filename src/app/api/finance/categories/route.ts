import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function GET() {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const items = await prisma.financeCategory.findMany({
      where: { clinicId: session.user.clinicId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("FinanceCategory GET error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN"]);
    const body = await req.json();
    const { name, type } = body as { name?: string; type?: "INCOME" | "EXPENSE" };
    if (!name || !type || !["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ message: "Geçersiz veri" }, { status: 400 });
    }
    const created = await prisma.financeCategory.create({
      data: { clinicId: session.user.clinicId, name, type: type as any },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("FinanceCategory POST error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
