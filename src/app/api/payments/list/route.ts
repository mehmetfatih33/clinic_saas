import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole, requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function GET() {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    const userRole = session.user.role;
    const userId = session.user.id;

    // If UZMAN, only show payments for their patients
    const whereClause = userRole === "UZMAN"
      ? {
          clinicId: session.user.clinicId,
          specialistId: userId  // Only their payments
        }
      : {
          clinicId: session.user.clinicId  // All clinic payments for ADMIN/ASISTAN
        };

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        specialistCut: true,
        clinicCut: true,
        createdAt: true,
        patient: { select: { name: true } },
        specialist: { select: { name: true } },
      },
    });

    return NextResponse.json({ ok: true, items: payments ?? [] }, { status: 200 });
  } catch (err) {
    console.error("💥 Payment list error:", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Giris gerekli", items: [] }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, message: "Bu listeye erisim yetkiniz yok", items: [] }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: (err as Error).message || "Sunucu hatası", items: [] }, { status: 500 });
  }
}
