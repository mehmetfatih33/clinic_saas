import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireSession();
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      // select kaldırıldı: bazı ortamlarda workSchedule alanı henüz yoksa 500 atıyordu
    });
    return NextResponse.json(clinic);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    return NextResponse.json({ message: "Ayarlar yüklenemedi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session as any, ["ADMIN"]);
    const body = await req.json();
    const { name, workSchedule } = body as { name?: string; workSchedule?: any };

    // workSchedule alanı bazı ortamlarda henüz olmadığı için sadece name güncellendi
    const updated = await prisma.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        ...(typeof name === "string" ? { name } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    return NextResponse.json({ message: "Ayarlar güncellenemedi" }, { status: 500 });
  }
}
