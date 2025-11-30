import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ message: "Geçersiz token" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "Şifre en az 6 karakter olmalı" }, { status: 400 });
    }

    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt) {
      return NextResponse.json({ message: "Token bulunamadı veya kullanıldı" }, { status: 400 });
    }
    if (vt.expires < new Date()) {
      // Süresi geçmiş token
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ message: "Token süresi dolmuş" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: vt.identifier } });
    if (!user) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const passwordHash = await hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Şifre başarıyla güncellendi" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return NextResponse.json({ message: "İstek işlenemedi" }, { status: 500 });
  }
}

