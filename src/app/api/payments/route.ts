import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const data = await req.json();

    const { patientId, amount } = data;
    
    if (!patientId || !amount || amount <= 0) {
      return NextResponse.json(
        { message: "Hasta seçimi ve geçerli bir ödeme tutarı gerekli. Lütfen gerekli alanları doldurun." },
        { status: 400 }
      );
    }

    // Fetch patient with specialist info
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
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
    await prisma.$transaction(async (tx) => {
      // Create payment
      await tx.payment.create({
        data: {
          patientId,
          specialistId: patient.assignedToId!,
          clinicId: session.user.clinicId,
          amount,
          specialistCut,
          clinicCut,
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
    });

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
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      // Return all payments for the clinic
      const payments = await prisma.payment.findMany({
        where: { clinicId: session.user.clinicId },
        include: {
          patient: { select: { name: true } },
          specialist: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json(payments);
    }

    // Return payments for specific patient
    const payments = await prisma.payment.findMany({
      where: {
        patientId,
        clinicId: session.user.clinicId,
      },
      include: {
        specialist: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("💥 Get Payments Error:", error);
    return NextResponse.json(
      { message: "Ödemeler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." },
      { status: 500 }
    );
  }
}
