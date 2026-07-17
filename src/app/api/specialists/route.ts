import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole, requireSession } from "@/lib/authz";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/mailer";
import { generatePassword } from "@/lib/utils";

// ✅ TÜM UZMANLARI GETİR
export async function GET() {
  try {
    const session = await requireSession();
    if (!session?.user) {
      console.error("❌ specialists GET unauthorized session");
      return NextResponse.json({ experts: [] }, { status: 401 });
    }

    const clinicId = session.user.clinicId;

    const specialists = await prisma.user.findMany({
      where: { role: "UZMAN", clinicId },
      include: { specialist: true },
    });

    // Performans iyileştirmesi: Hasta sayılarını her seferinde hesaplamak yerine
    // sadece uzman listesi için gerekli temel bilgileri dönüyoruz.
    // Eğer istatistik gerekirse ayrı bir endpoint kullanılmalı.

    const data = specialists.map((sp: any) => ({
      id: sp.id,
      name: sp.name,
      email: sp.email,
      specialist: {
        id: sp.specialist?.id ?? "",
        branch: sp.specialist?.branch ?? "Belirtilmemiş",
        defaultShare: sp.specialist?.defaultShare ?? 50,
        hourlyFee: (sp.specialist as any)?.hourlyFee ?? 0,
        totalPatients: 0, // Performans için devre dışı bırakıldı
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
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN"]);

    const data = await req.json();
    const clinicId = session.user.clinicId;

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
    const rawPassword = data.password || generatePassword(10);
    const passwordHash = await hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        address: data.address ?? null,
        role: "UZMAN",
        clinicId: clinicId,
        passwordHash: passwordHash,
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

    // E-posta gönder (şifre otomatik oluşturulduysa veya kullanıcıya bildirmek için)
    try {
      await sendEmail(
        user.email,
        "Klinik Hesabınız Oluşturuldu",
        `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Merhaba ${user.name},</h2>
          <p>Klinik yönetim sistemine uzman hesabınız tanımlanmıştır.</p>
          <p>Giriş bilgileriniz aşağıdadır:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>E-posta:</strong> ${user.email}</p>
            <p><strong>Şifre:</strong> ${rawPassword}</p>
          </div>
          <p>Giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
          <p>İyi çalışmalar.</p>
        </div>
        `
      );
      console.log("📧 Uzman şifre maili gönderildi:", user.email);
    } catch (mailError) {
      console.error("❌ Mail gönderilemedi:", mailError);
      // Mail hatası işlemi durdurmamalı
    }

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
