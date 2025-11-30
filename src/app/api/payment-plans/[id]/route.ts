import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN"]);
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: "PLANNED" | "PAID" | "CANCELED" };

    if (!status || !["PLANNED", "PAID", "CANCELED"].includes(status)) {
      return NextResponse.json({ message: "Geçerli bir durum gerekli" }, { status: 400 });
    }

    const plan = await prisma.paymentPlan.findFirst({
      where: { id, clinicId: session.user.clinicId },
    });
    if (!plan) return NextResponse.json({ message: "Plan bulunamadı" }, { status: 404 });

    const updated = await prisma.paymentPlan.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: "PAYMENT_PLAN_UPDATE",
        entity: "PaymentPlan",
        entityId: id,
        meta: { status, message: `Plan durumu güncellendi: ${status === "PAID" ? "Ödendi" : status === "CANCELED" ? "İptal" : "Bekliyor"}` },
      },
    });

    if (status === "PAID") {
      // Record as transaction. For INCOMING with patient+specialist, also create Payment
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            clinicId: session.user.clinicId,
            patientId: plan.patientId,
            specialistId: plan.specialistId,
            type: plan.type === "INCOMING" ? "INCOME" : "EXPENSE",
            amount: plan.amount,
            description: plan.description ?? `Plan ödemesi (${plan.type})`,
            date: new Date(),
          },
        });

        try {
          await tx.cashTransaction.create({
            data: {
              clinicId: session.user.clinicId,
              type: plan.type === "INCOMING" ? "IN" : "OUT",
              category: plan.type === "INCOMING" ? "DIGER_GELIR" : "DIGER_GIDER",
              amount: plan.amount,
              patientId: plan.patientId ?? null,
              specialistId: plan.specialistId ?? null,
              description: plan.description ?? `Plan kapatma (${plan.type})`,
            },
          });
        } catch (e) {
          console.error("CashTransaction create error (plan close)", e);
        }

        await tx.auditLog.create({
          data: {
            clinicId: session.user.clinicId,
            actorId: session.user.id,
            action: "PAYMENT_PLAN_PAID",
            entity: "PaymentPlan",
            entityId: id,
            meta: { amount: plan.amount, message: `Plan ödendi: ${plan.amount.toLocaleString("tr-TR")} ₺` },
          },
        });

        if (plan.type === "INCOMING" && plan.patientId && plan.specialistId) {
          const patient = await tx.patient.findUnique({
            where: { id: plan.patientId },
            include: { specialist: { include: { specialist: true } } },
          });
          if (patient && patient.assignedToId) {
            const share = patient.specialist?.specialist?.defaultShare ?? 50;
            const specialistCut = (plan.amount * share) / 100;
            const clinicCut = plan.amount - specialistCut;

            await tx.payment.create({
              data: {
                patientId: plan.patientId,
                specialistId: patient.assignedToId,
                clinicId: session.user.clinicId,
                amount: plan.amount,
                specialistCut,
                clinicCut,
              },
            });

            await tx.patient.update({ where: { id: plan.patientId }, data: { totalPayments: { increment: plan.amount } } });
            await tx.specialistProfile.updateMany({ where: { userId: patient.assignedToId }, data: { totalRevenue: { increment: specialistCut } } });
          }
        }
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("❌ Plan update error:", err);
    return NextResponse.json({ message: "Plan güncellenemedi" }, { status: 500 });
  }
}
