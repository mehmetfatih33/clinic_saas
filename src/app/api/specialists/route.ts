import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

// ✅ TÜM UZMANLARI GETİR
export async function GET() {
  try {
    const specialists = await prisma.user.findMany({
      where: { role: "UZMAN" },
      include: { specialist: true },
    });

    const data = specialists.map((sp) => ({
      id: sp.id,
      name: sp.name,
      email: sp.email,
      specialist: {
        id: sp.specialist?.id ?? "",
        branch: sp.specialist?.branch ?? "Belirtilmemiş",
        defaultShare: sp.specialist?.defaultShare ?? 50,
        hourlyFee: (sp.specialist as any)?.hourlyFee ?? 0,
        totalPatients: sp.specialist?.totalPatients ?? 0,
        totalRevenue: sp.specialist?.totalRevenue ?? 0,
        bio: sp.specialist?.bio ?? "",
      },
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Uzman listesi yüklenemedi:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// ✅ YENİ UZMAN OLUŞTUR
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    console.log("📝 Received data:", data);

    // Klinik ID belirle
    const clinicId = session.user.clinicId || "cmgi34x7j0000ngtzwr7ishxn";

    // Aynı e-posta var mı kontrol et
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      console.log("❌ Email already exists:", data.email);
      return NextResponse.json({ message: "Bu e-posta zaten kayıtlı.", error: "Email exists" }, { status: 400 });
    }

    // Uzman oluştur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: "UZMAN",
        clinicId: clinicId,
        passwordHash: await hash(data.password || "123456", 10),
        specialist: {
          create: {
            clinicId: clinicId,
            branch: data.branch ?? null,
            bio: data.bio ?? null,
            defaultShare: Number(data.defaultShare) || 50,
            hourlyFee: Number(data.hourlyFee) || 0,
            totalPatients: 0,
            totalRevenue: 0,
          },
        },
      },
      include: { specialist: true },
    });

    console.log("✅ Yeni uzman oluşturuldu:", user.email);
    return NextResponse.json(user, { status: 201 });

  } catch (err: any) {
    console.error("❌ SPECIALIST_CREATE_ERR", err);
    console.error("❌ Error details:", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta
    });
    return NextResponse.json(
      { 
        message: "Uzman kaydedilemedi", 
        error: String(err?.message || err), 
        code: err?.code || null, 
        meta: err?.meta || null 
      },
      { status: 500 }
    );
  }
}