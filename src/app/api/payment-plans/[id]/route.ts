import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "accounting"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
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

    if (status === plan.status) {
      return NextResponse.json(plan);
    }

    if (status === "PAID") {
      const updated = await prisma.$transaction(async (tx: any) => {
        const markPaid = await tx.paymentPlan.updateMany({
          where: {
            id,
            clinicId: session.user.clinicId,
            status: "PLANNED",
          },
          data: { status: "PAID" },
        });

        if (markPaid.count === 0) {
          throw new Error("PLAN_ALREADY_PROCESSED");
        }

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

        if (plan.type === "INCOMING" && plan.patientId && plan.specialistId) {
          const patient = await tx.patient.findFirst({
            where: {
              id: plan.patientId,
              clinicId: session.user.clinicId,
            },
            include: { specialist: { include: { specialist: true } } },
          });

          if (!patient || !patient.assignedToId) {
            throw new Error("PLAN_PATIENT_ASSIGNMENT_MISSING");
          }

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

          await tx.patient.update({
            where: { id: plan.patientId },
            data: { totalPayments: { increment: plan.amount } },
          });
          await tx.specialistProfile.updateMany({
            where: { userId: patient.assignedToId },
            data: { totalRevenue: { increment: specialistCut } },
          });
        }

        await tx.auditLog.create({
          data: {
            clinicId: session.user.clinicId,
            actorId: session.user.id,
            action: "PAYMENT_PLAN_PAID",
            entity: "PaymentPlan",
            entityId: id,
            meta: {
              amount: plan.amount,
              message: `Plan ödendi: ${plan.amount.toLocaleString("tr-TR")} ₺`,
            },
          },
        });

        return tx.paymentPlan.findUnique({ where: { id } });
      });

      return NextResponse.json(updated);
    }

    if (status === "CANCELED") {
      const markCanceled = await prisma.paymentPlan.updateMany({
        where: {
          id,
          clinicId: session.user.clinicId,
          status: "PLANNED",
        },
        data: { status: "CANCELED" },
      });

      if (markCanceled.count === 0) {
        return NextResponse.json(
          { message: "Bu plan zaten işlenmiş." },
          { status: 409 }
        );
      }

      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PAYMENT_PLAN_UPDATE",
          entity: "PaymentPlan",
          entityId: id,
          meta: { status, message: "Plan durumu güncellendi: İptal" },
        },
      });

      const updated = await prisma.paymentPlan.findUnique({ where: { id } });
      return NextResponse.json(updated);
    }

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
        meta: { status, message: "Plan durumu güncellendi" },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("❌ Plan update error:", err);
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giris gerekli" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Bu islemi yapma yetkiniz yok" }, { status: 403 });
    }
    if (err?.message === "PLAN_ALREADY_PROCESSED") {
      return NextResponse.json({ message: "Bu plan zaten islenmis." }, { status: 409 });
    }
    if (err?.message === "PLAN_PATIENT_ASSIGNMENT_MISSING") {
      return NextResponse.json(
        { message: "Hasta aktif bir uzmana bagli olmadigi icin plan odemesi tamamlanamadi." },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Plan güncellenemedi" }, { status: 500 });
  }
}
