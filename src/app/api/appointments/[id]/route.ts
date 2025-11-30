import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { id } = await params;
    const { status, date, duration, notes } = await req.json();

    console.log("🔄 Appointment update request:", { id, status, date, duration, notes });

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ message: "Randevu bulunamadı" }, { status: 404 });
    }

    const effectiveDate = date ? new Date(date) : appointment.date;
    const effectiveDuration = typeof duration === "number" ? duration : appointment.duration;

    if (status === "COMPLETED") {
      const now = new Date();
      if (now < effectiveDate) {
        return NextResponse.json({ message: "Randevunun günü/saati gelmeden tamamlanamaz." }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (date) updateData.date = new Date(date);
    if (duration !== undefined) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: updateData,
      });

      if (status === "COMPLETED" && appointment.status !== "COMPLETED") {
        const patient = await tx.patient.findFirst({
          where: { id: appointment.patientId, clinicId: session.user.clinicId },
        });
        const sp = await tx.specialistProfile.findFirst({
          where: { userId: appointment.specialistId, clinicId: session.user.clinicId },
        });

        let amount = 0;
        if (patient?.fee && patient?.specialistShare) {
          amount = Number(patient.fee) * Number(patient.specialistShare) / 100;
        } else if (sp?.hourlyFee) {
          amount = Number(sp.hourlyFee) * (effectiveDuration / 60);
        }
        amount = Math.round(amount * 100) / 100;

        if (amount > 0) {
          await tx.transaction.create({
            data: {
              clinicId: session.user.clinicId,
              patientId: appointment.patientId,
              specialistId: appointment.specialistId,
              type: "INCOME" as any,
              amount,
              description: "Randevu tamamlandı: Uzman ücreti hasta bakiyesine işlendi",
              date: new Date(),
            },
          });

          await tx.patient.update({
            where: { id: appointment.patientId },
            data: { totalSessions: { increment: 1 } },
          });
        }
      }

      return result;
    });

    console.log("✅ Appointment updated successfully:", updated.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("❌ Appointment Update Error:", error);
    return NextResponse.json({ message: "Randevu güncellenirken bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
