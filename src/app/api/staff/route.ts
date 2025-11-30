import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hash } from "bcryptjs";
import type { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireSession();
    const staff = await prisma.user.findMany({
      where: { clinicId: session.user.clinicId, NOT: { role: "UZMAN" } },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    return NextResponse.json(staff);
  } catch (err: any) {
    return NextResponse.json({ message: "Çalışanlar yüklenemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session as any, ["ADMIN"]);
    const { name, email, phone, password, role } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ message: "İsim ve e‑posta zorunlu" }, { status: 400 });
    }
    const emailOk = /.+@.+\..+/.test(String(email));
    if (!emailOk) {
      return NextResponse.json({ message: "Geçerli bir e‑posta girin" }, { status: 400 });
    }
    // Duplicate email check (global unique)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "Bu e‑posta ile kullanıcı zaten kayıtlı" }, { status: 409 });
    }

    const normalizedRole = (role === "ADMIN" ? "ADMIN" : role === "ASISTAN" ? "ASISTAN" : "PERSONEL") as Role;
    let passwordHash: string | null = null;
    if (normalizedRole === "ADMIN" || normalizedRole === "ASISTAN") {
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ message: "ADMIN/ASISTAN için şifre zorunlu (min 6)" }, { status: 400 });
      }
      passwordHash = await hash(password, 10);
    }

    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: normalizedRole,
        clinicId: session.user.clinicId,
      },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Staff POST error:", err);
    const msg = err?.message || "Çalışan oluşturulamadı";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}
