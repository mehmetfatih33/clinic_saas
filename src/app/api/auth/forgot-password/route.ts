import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

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

    // Geliştirme ortamında bağlantıyı döndür
    return NextResponse.json({
      message: "Şifre sıfırlama bağlantısı e‑postanıza gönderildi",
      resetUrl,
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json({ message: "İstek işlenemedi" }, { status: 500 });
  }
}

