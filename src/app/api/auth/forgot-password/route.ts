import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Geçerli bir e‑posta girin" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Yanıtta kullanıcı var/yok bilgisini gizle
    if (!user) {
      return NextResponse.json({ message: "Eğer hesap mevcutsa talimatlar gönderildi" });
    }

    // Önce mevcut tokenları temizle
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password/${token}`;

    // E-posta gönderimi
    try {
      await sendEmail(
        email,
        "Şifre Sıfırlama Talebi",
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Şifre Sıfırlama</h2>
          <p>Merhaba ${user.name || "Kullanıcı"},</p>
          <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Şifremi Sıfırla</a>
          </div>
          <p>Veya şu bağlantıyı tarayıcınıza yapıştırın:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Bu talep sizden gelmediyse bu e-postayı görmezden gelebilirsiniz.</p>
          <p>Link 1 saat boyunca geçerlidir.</p>
        </div>
        `
      );
    } catch (emailError) {
      console.error("❌ E-posta gönderilemedi:", emailError);
      // E-posta hatası olsa bile kullanıcıya başarılı döndür (güvenlik için)
      // Ancak loglarda hatayı görebiliriz
    }

    // Geliştirme ortamında bağlantıyı döndür, prod ortamında gizle
    const isDev = process.env.NODE_ENV === "development";
    
    return NextResponse.json({
      message: "Eğer hesap mevcutsa talimatlar gönderildi",
      resetUrl: isDev ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json({ message: "İstek işlenemedi" }, { status: 500 });
  }
}

