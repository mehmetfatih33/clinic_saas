import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    const { id } = await params;
    const list = await prisma.specialistTimeOff.findMany({
      where: { clinicId: session.user.clinicId, specialistId: id },
      orderBy: { start: "desc" },
    });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Tatil günleri yüklenemedi" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { start, end, reason } = body as { start: string; end?: string; reason?: string };

    if (!start) return NextResponse.json({ message: "Başlangıç tarihi zorunlu" }, { status: 400 });

    // UZMAN sadece kendi kaydını oluşturabilir; ADMIN/ASISTAN herkes için oluşturabilir
    if (session.user.role === "UZMAN" && session.user.id !== id) {
      return NextResponse.json({ message: "Yetkisiz işlem" }, { status: 403 });
    }

    const created = await prisma.specialistTimeOff.create({
      data: {
        clinicId: session.user.clinicId,
        specialistId: id,
        start: new Date(start),
        end: end ? new Date(end) : null,
        reason: reason || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Tatil günü eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    const { id } = await params;
    const { timeoffId } = await req.json();
    if (!timeoffId) return NextResponse.json({ message: "Kayıt ID gerekli" }, { status: 400 });

    const item = await prisma.specialistTimeOff.findUnique({ where: { id: timeoffId } });
    if (!item || item.clinicId !== session.user.clinicId || item.specialistId !== id) {
      return NextResponse.json({ message: "Kayıt bulunamadı" }, { status: 404 });
    }

    if (session.user.role === "UZMAN" && session.user.id !== id) {
      return NextResponse.json({ message: "Yetkisiz işlem" }, { status: 403 });
    }

    await prisma.specialistTimeOff.delete({ where: { id: timeoffId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Tatil günü silinemedi" }, { status: 500 });
  }
}
