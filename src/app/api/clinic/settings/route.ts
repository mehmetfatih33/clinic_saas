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
    const { name, workSchedule, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body as { 
      name?: string; 
      workSchedule?: any;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      smtpFrom?: string;
    };

    const updated = await prisma.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        ...(typeof name === "string" ? { name } : {}),
        ...(workSchedule ? { workSchedule } : {}),
        ...(typeof smtpHost === "string" ? { smtpHost } : {}),
        ...(typeof smtpPort === "number" ? { smtpPort } : {}),
        ...(typeof smtpUser === "string" ? { smtpUser } : {}),
        ...(typeof smtpPass === "string" ? { smtpPass } : {}),
        ...(typeof smtpFrom === "string" ? { smtpFrom } : {}),
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
