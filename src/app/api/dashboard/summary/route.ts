import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function GET() {
  try {
    const session = await requireSession();
    const clinicId = session.user.clinicId;
    const isUzman = session.user.role === "UZMAN";
    const userId = session.user.id;
    const now = new Date();

    const patientWhere = isUzman
      ? { clinicId, assignedToId: userId }
      : { clinicId };
    const appointmentWhere = isUzman
      ? { clinicId, specialistId: userId }
      : { clinicId };
    const paymentWhere = isUzman
      ? { clinicId, specialistId: userId }
      : { clinicId };
    const transactionWhere = isUzman
      ? { clinicId, specialistId: userId }
      : { clinicId };

    const roomsEnabled = isUzman ? false : await hasFeature(clinicId, "room-tracking");

    const [
      patientCount,
      recentPaymentCount,
      incomeAggregate,
      incomeTransactions,
      expenseTransactions,
      recentAppointments,
      recentPatients,
      recentPayments,
      totalAppointments,
      todayAppointments,
      recentPatients30d,
      totalSpecialists,
      totalRooms,
      busyAppointments,
    ] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.payment.count({
        where: {
          ...paymentWhere,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.payment.aggregate({
        where: paymentWhere,
        _sum: {
          ...(isUzman ? { specialistCut: true } : { amount: true }),
        },
      }),
      prisma.transaction.aggregate({
        where: { ...transactionWhere, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...transactionWhere, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.appointment.findMany({
        where: {
          ...appointmentWhere,
          status: { not: "CANCELED" },
          date: { gte: startOfToday() },
        },
        select: {
          id: true,
          date: true,
          createdAt: true,
          status: true,
          notes: true,
          patient: { select: { id: true, name: true } },
          specialist: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
        take: 3,
      }),
      prisma.patient.findMany({
        where: patientWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          patient: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      isUzman ? Promise.resolve(0) : prisma.appointment.count({ where: appointmentWhere }),
      isUzman
        ? Promise.resolve(0)
        : prisma.appointment.count({
            where: {
              ...appointmentWhere,
              status: { not: "CANCELED" },
              date: { gte: startOfToday(), lte: endOfToday() },
            },
          }),
      isUzman
        ? Promise.resolve(0)
        : prisma.patient.count({
            where: {
              clinicId,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
      isUzman
        ? Promise.resolve(0)
        : prisma.user.count({
            where: { clinicId, role: "UZMAN" },
          }),
      roomsEnabled
        ? prisma.room.count({
            where: { clinicId, isActive: true },
          })
        : Promise.resolve(0),
      roomsEnabled
        ? prisma.appointment.findMany({
            where: {
              clinicId,
              status: { not: "CANCELED" },
              roomId: { not: null },
              date: {
                gte: new Date(now.getTime() - 240 * 60 * 1000),
                lte: new Date(now.getTime() + 60 * 60 * 1000),
              },
            },
            select: { roomId: true, date: true, duration: true },
          })
        : Promise.resolve([]),
    ]);

    const income =
      (isUzman
        ? (incomeAggregate._sum as { specialistCut?: number | null }).specialistCut
        : (incomeAggregate._sum as { amount?: number | null }).amount) ?? 0;

    let availableRooms = 0;
    if (roomsEnabled && totalRooms > 0) {
      const requestedEnd = new Date(now.getTime() + 60 * 60 * 1000);
      const busyRoomIds = new Set<string>();

      for (const appointment of busyAppointments) {
        const appointmentStart = new Date(appointment.date);
        const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration * 60000);
        if (appointmentStart < requestedEnd && appointmentEnd > now && appointment.roomId) {
          busyRoomIds.add(appointment.roomId);
        }
      }

      availableRooms = Math.max(totalRooms - busyRoomIds.size, 0);
    }

    return NextResponse.json({
      stats: {
        patients: patientCount,
        payments: recentPaymentCount,
        income: Math.round(income),
      },
      financeSummary: {
        income: Math.round(incomeTransactions._sum.amount ?? 0),
        expense: Math.round(expenseTransactions._sum.amount ?? 0),
        net: Math.round((incomeTransactions._sum.amount ?? 0) - (expenseTransactions._sum.amount ?? 0)),
      },
      recentAppointments,
      recentPatients,
      recentPayments,
      adminOverview: isUzman
        ? null
        : {
            totalAppointments,
            todayAppointments,
            totalPatients: patientCount,
            recentPatients30d,
            totalRooms,
            availableRooms,
            totalSpecialists,
          },
    });
  } catch (error) {
    console.error("💥 Dashboard summary error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
