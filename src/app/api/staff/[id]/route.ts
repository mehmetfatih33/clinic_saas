import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    ensureRole(session as any, ["ADMIN"]);
    
    const { id } = await params;
    const body = await req.json();
    
    // Prevent updating self if needed, or allow it. Usually admins can update themselves.
    
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (user.clinicId !== session.user.clinicId) {
      return NextResponse.json({ message: "Yetkisiz işlem" }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.email) {
      // Check if email is taken
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ message: "Bu e-posta adresi zaten kullanımda" }, { status: 409 });
      }
      updateData.email = body.email;
    }
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role) updateData.role = body.role as Role;
    
    if (body.password && body.password.length >= 6) {
      updateData.passwordHash = await hash(body.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return NextResponse.json(updatedUser);

  } catch (error: any) {
    console.error("Staff PATCH error:", error);
    return NextResponse.json({ message: error.message || "Güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    ensureRole(session as any, ["ADMIN"]);
    
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (user.clinicId !== session.user.clinicId) {
      return NextResponse.json({ message: "Yetkisiz işlem" }, { status: 403 });
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ message: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Staff DELETE error:", error);
    return NextResponse.json({ message: error.message || "Silme işlemi başarısız" }, { status: 500 });
  }
}
