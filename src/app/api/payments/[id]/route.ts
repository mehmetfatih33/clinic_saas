import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    ensureRole(session, ["ADMIN"]);
    const body = await req.json();
    const { amount } = body as { amount?: number };
    if (typeof amount !== "number" || amount <= 0) return NextResponse.json({ message: "Geçersiz veri" }, { status: 400 });

    const payment = await prisma.payment.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!payment) return NextResponse.json({ message: "Ödeme bulunamadı" }, { status: 404 });

    // Recompute shares
    const patient = await prisma.patient.findUnique({
      where: { id: payment.patientId },
      include: { specialist: { include: { specialist: true } } },
    });
    const share = patient?.specialist?.specialist?.defaultShare ?? 50;
    const newSpecialistCut = (amount * share) / 100;
    const newClinicCut = amount - newSpecialistCut;
    const amountDelta = amount - payment.amount;
    const specialistDelta = newSpecialistCut - payment.specialistCut;

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id },
        data: { amount, specialistCut: newSpecialistCut, clinicCut: newClinicCut },
      });

      await tx.patient.update({ where: { id: payment.patientId }, data: { totalPayments: { increment: amountDelta } } });
      await tx.specialistProfile.updateMany({ where: { userId: payment.specialistId }, data: { totalRevenue: { increment: specialistDelta } } });

      await tx.cashTransaction.updateMany({ where: { paymentId: id, clinicId: session.user.clinicId }, data: { amount } });
    });

    try {
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PAYMENT_UPDATE",
          entity: "Payment",
          entityId: id,
          meta: {
            amount,
            oldAmount: payment.amount,
            message: `Ödeme güncellendi: ${payment.amount} -> ${amount} ₺`,
          },
        },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return NextResponse.json({ message: "Ödeme güncellendi" });
  } catch (err: any) {
    console.error("Payment PATCH error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    ensureRole(session, ["ADMIN"]);
    const payment = await prisma.payment.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!payment) return NextResponse.json({ message: "Ödeme bulunamadı" }, { status: 404 });

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.delete({ where: { id } });
      await tx.patient.update({ where: { id: payment.patientId }, data: { totalPayments: { decrement: payment.amount } } });
      await tx.specialistProfile.updateMany({ where: { userId: payment.specialistId }, data: { totalRevenue: { decrement: payment.specialistCut } } });
      await tx.cashTransaction.deleteMany({ where: { paymentId: id, clinicId: session.user.clinicId } });
    });

    try {
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PAYMENT_DELETE",
          entity: "Payment",
          entityId: id,
          meta: {
            amount: payment.amount,
            message: `Ödeme silindi: ${payment.amount} ₺`,
          },
        },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return NextResponse.json({ message: "Ödeme silindi" });
  } catch (err: any) {
    console.error("Payment DELETE error:", err);
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

