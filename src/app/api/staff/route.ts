import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";
import { generatePassword } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireSession();
    const staff = await prisma.user.findMany({
      where: { clinicId: session.user.clinicId, NOT: { role: "UZMAN" } },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    return NextResponse.json({ ok: true, items: staff ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Staff GET error:", err);
    return NextResponse.json({ ok: false, error: String(err), items: [] }, { status: 200 });
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
    let finalPassword = password;

    // Admin/Asistan ise ve şifre yoksa otomatik oluştur
    if ((normalizedRole === "ADMIN" || normalizedRole === "ASISTAN") && !finalPassword) {
      finalPassword = generatePassword(10);
    }

    if (normalizedRole === "ADMIN" || normalizedRole === "ASISTAN") {
      if (!finalPassword || typeof finalPassword !== "string" || finalPassword.length < 6) {
        return NextResponse.json({ message: "ADMIN/ASISTAN için şifre zorunlu (min 6)" }, { status: 400 });
      }
      passwordHash = await hash(finalPassword, 10);
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

    // E-posta gönder (Sadece şifre belirlendiyse/oluşturulduysa)
    if (finalPassword && passwordHash) {
      try {
        await sendEmail(
          created.email,
          "Klinik Personel Hesabınız Oluşturuldu",
          `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Merhaba ${created.name},</h2>
            <p>Klinik yönetim sistemine <strong>${normalizedRole}</strong> olarak kaydınız yapılmıştır.</p>
            <p>Giriş bilgileriniz aşağıdadır:</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>E-posta:</strong> ${created.email}</p>
              <p><strong>Şifre:</strong> ${finalPassword}</p>
            </div>
            <p>Giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
            <p>İyi çalışmalar.</p>
          </div>
          `
        );
        console.log("📧 Personel şifre maili gönderildi:", created.email);
      } catch (mailError) {
        console.error("❌ Personel mail gönderilemedi:", mailError);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Staff POST error:", err);
    const msg = err?.message || "Çalışan oluşturulamadı";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}
