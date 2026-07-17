import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole, requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const data = await req.json();

    const { patientId, amount } = data;
    
    if (!patientId || !amount || amount <= 0) {
      return NextResponse.json(
        { message: "Hasta seçimi ve geçerli bir ödeme tutarı gerekli. Lütfen gerekli alanları doldurun." },
        { status: 400 }
      );
    }

    // Fetch patient with specialist info
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
      include: { 
        specialist: {
          include: {
            specialist: true
          }
        } 
      },
    });

    if (!patient) {
      return NextResponse.json(
        { message: "Seçilen hasta bulunamadı. Lütfen geçerli bir hasta seçin." },
        { status: 404 }
      );
    }

    if (!patient.assignedToId) {
      return NextResponse.json(
        { message: "Hasta henüz bir uzmana atanmamış. Lütfen önce hastayı bir uzmana atayın." },
        { status: 400 }
      );
    }

    // Get specialist's share percentage
    const share = patient.specialist?.specialist?.defaultShare ?? 50;
    const specialistCut = (amount * share) / 100;
    const clinicCut = amount - specialistCut;

    // Create payment record with transaction
    const payment = await prisma.$transaction(async (tx: any) => {
      // Create payment
      const created = await tx.payment.create({
        data: {
          patientId,
          specialistId: patient.assignedToId!,
          clinicId: session.user.clinicId,
          amount,
          specialistCut,
          clinicCut,
        },
      });

      await tx.cashTransaction.create({
        data: {
          clinicId: session.user.clinicId,
          type: "IN",
          category: "HASTA_ODEME",
          amount,
          paymentId: created.id,
          patientId,
          specialistId: patient.assignedToId!,
          description: `Hasta ödemesi: ₺${amount.toFixed(2)}`,
        },
      });

      // Update patient's total payments
      await tx.patient.update({
        where: { id: patientId },
        data: { totalPayments: { increment: amount } },
      });

      // Update specialist's total revenue
      await tx.specialistProfile.updateMany({
        where: { userId: patient.assignedToId! },
        data: { totalRevenue: { increment: specialistCut } },
      });

      return created;
    });

    // Log the payment
    try {
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PAYMENT_CREATE",
          entity: "Payment",
          entityId: payment.id,
          meta: {
            amount,
            patientId,
            message: `Hasta ödemesi alındı: ${amount.toLocaleString("tr-TR")} ₺`,
          },
        },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return NextResponse.json({
      message: "Ödeme başarıyla kaydedildi",
      payment: {
        amount,
        specialistCut,
        clinicCut,
        share: `${share}%`,
      },
    });
  } catch (error) {
    console.error("💥 Payment Error:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giris gerekli" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Odeme olusturma yetkiniz yok." }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch payments for a patient
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const isUzman = session.user.role === "UZMAN";

    if (!patientId) {
      // Return all payments for the clinic
      const payments = await prisma.payment.findMany({
        where: isUzman
          ? {
              clinicId: session.user.clinicId,
              specialistId: session.user.id,
            }
          : { clinicId: session.user.clinicId },
        include: {
          patient: { select: { name: true } },
          specialist: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json(payments);
    }

    if (isUzman) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          clinicId: session.user.clinicId,
          assignedToId: session.user.id,
        },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json(
          { message: "Bu hastanin odeme kayitlarini gorme yetkiniz yok." },
          { status: 403 }
        );
      }
    }

    // Return payments for specific patient
    const payments = await prisma.payment.findMany({
      where: {
        patientId,
        clinicId: session.user.clinicId,
        ...(isUzman ? { specialistId: session.user.id } : {}),
      },
      include: {
        specialist: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("💥 Get Payments Error:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giris gerekli" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Odeme kayitlarina erisim yetkiniz yok." }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Ödemeler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." },
      { status: 500 }
    );
  }
}
