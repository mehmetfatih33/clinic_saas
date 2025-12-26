import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ message: "Bildirim bulunamadı" }, { status: 404 });
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ message: "Yetkisiz işlem" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "İşlem başarısız" }, { status: 500 });
  }
}
