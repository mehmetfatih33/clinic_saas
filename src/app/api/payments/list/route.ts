import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function GET() {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
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
      include: {
        patient: { select: { name: true } },
        specialist: { select: { name: true } },
      },
    });

    return NextResponse.json(payments);
  } catch (err) {
    console.error("💥 Payment list error:", err);
    return NextResponse.json({ message: "Ödeme listesi yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." }, { status: 500 });
  }
}
