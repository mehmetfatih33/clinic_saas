import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

// ✅ TÜM UZMANLARI GETİR
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ specialists GET unauthorized session");
      return NextResponse.json({ experts: [] }, { status: 401 });
    }

    const clinicId = session.user.clinicId;

    const specialists = await prisma.user.findMany({
      where: { role: "UZMAN", clinicId },
      include: { specialist: true },
    });

    const patientGroups = await prisma.patient.groupBy({
      by: ["assignedToId"],
      where: { clinicId },
      _count: { _all: true },
    });
    const patientCountMap = new Map<string, number>();
    patientGroups.forEach((g: any) => {
      if (g.assignedToId) patientCountMap.set(g.assignedToId, g._count._all || 0);
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
        totalPatients: patientCountMap.get(sp.id) ?? 0,
        totalRevenue: sp.specialist?.totalRevenue ?? 0,
        bio: sp.specialist?.bio ?? "",
      },
    }));

    return NextResponse.json({ experts: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error("❌ Uzman listesi yüklenemedi:", error);
    return NextResponse.json({ experts: [] }, { status: 500 });
  }
}

// ✅ YENİ UZMAN OLUŞTUR
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
    }

    const data = await req.json();
    console.log("📝 Received data:", data);

    const sessionClinicId = session.user.clinicId;
    let clinic = null as any;
    if (sessionClinicId) {
      clinic = await prisma.clinic.findUnique({ where: { id: sessionClinicId } });
    }
    if (!clinic) {
      clinic = await prisma.clinic.findUnique({ where: { slug: "default" } });
    }
    if (!clinic) {
      clinic = await prisma.clinic.create({ data: { name: "Demo Klinik", slug: "default" } });
    }
    const clinicId = clinic.id as string;

    // Aynı e-posta var mı kontrol et
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      console.log("❌ Email already exists:", data.email);
      return NextResponse.json({ message: "Bu e-posta adresi zaten kayıtlı. Lütfen farklı bir e-posta adresi kullanın." }, { status: 400 });
    }

    if (!data.name || !data.email || !data.phone) {
      return NextResponse.json({ message: "Ad, e-posta ve telefon zorunludur." }, { status: 400 });
    }

    // Uzman oluştur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        address: data.address ?? null,
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
        message: "Uzman kaydedilirken bir hata oluştu. Lütfen tekrar deneyin."
      },
      { status: 500 }
    );
  }
}
