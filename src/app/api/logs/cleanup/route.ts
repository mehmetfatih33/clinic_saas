import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["SUPER_ADMIN", "ADMIN"]);

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const days = parseInt(daysParam || "365"); // Default to 1 year

    if (isNaN(days) || days < 30) {
      return NextResponse.json(
        { message: "Geçersiz gün sayısı. En az 30 gün olmalı." },
        { status: 400 }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const where: any = {
      createdAt: {
        lt: cutoffDate,
      },
    };

    // If not super admin, only delete their own clinic's logs
    if (session.user.role !== "SUPER_ADMIN") {
      where.clinicId = session.user.clinicId;
    }

    const result = await prisma.auditLog.deleteMany({
      where,
    });

    // Log this cleanup action (ironic, but necessary)
    await prisma.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: "LOG_CLEANUP",
        entity: "AuditLog",
        entityId: "bulk-delete",
        meta: {
          deletedCount: result.count,
          cutoffDate,
          message: `${days} günden eski ${result.count} log kaydı silindi.`,
        },
      },
    });

    return NextResponse.json({
      message: `${result.count} adet eski log silindi.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Log cleanup error:", error);
    return NextResponse.json(
      { message: "Log temizleme işlemi başarısız oldu." },
      { status: 500 }
    );
  }
}
