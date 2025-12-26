import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    const { id } = params;

    const { status, priority, title, description, assignedToId, dueDate } = await req.json();

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ message: "Görev bulunamadı" }, { status: 404 });
    }

    if (existingTask.clinicId !== session.user.clinicId) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 403 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        priority,
        title,
        description,
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("❌ Task Update Error:", error);
    return NextResponse.json({ message: "Görev güncellenirken bir hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]); // Only allow deletion if authorized? Maybe only Creator or Admin?
    const { id } = params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ message: "Görev bulunamadı" }, { status: 404 });
    }

    if (existingTask.clinicId !== session.user.clinicId) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 403 });
    }

    // Optional: Check if user is creator or admin
    if (session.user.role !== "ADMIN" && existingTask.createdById !== session.user.id) {
       return NextResponse.json({ message: "Sadece oluşturan kişi veya yönetici silebilir." }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Görev silindi" });
  } catch (error: any) {
    console.error("❌ Task Delete Error:", error);
    return NextResponse.json({ message: "Görev silinirken bir hata oluştu." }, { status: 500 });
  }
}
