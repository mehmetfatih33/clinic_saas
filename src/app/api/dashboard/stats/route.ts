import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireSession();
    const userRole = session.user.role;
    const userId = session.user.id;
    const clinicId = session.user.clinicId;

    let stats;

    if (userRole === "UZMAN") {
      // UZMAN: Only their own stats
      const [patientCount, totalPayments, recentPayments] = await Promise.all([
        // Count patients assigned to this specialist
        prisma.patient.count({
          where: { 
            assignedToId: userId,
            clinicId 
          }
        }),
        // Total revenue (specialist cut)
        prisma.payment.aggregate({
          where: { 
            specialistId: userId,
            clinicId 
          },
          _sum: { specialistCut: true }
        }),
        // Recent payments count (last 7 days)
        prisma.payment.count({
          where: {
            specialistId: userId,
            clinicId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      stats = {
        patients: patientCount,
        payments: recentPayments,
        income: Math.round(totalPayments._sum.specialistCut || 0)
      };
    } else {
      // ADMIN/ASISTAN: Clinic-wide stats
      const [patientCount, totalPayments, recentPayments] = await Promise.all([
        // All clinic patients
        prisma.patient.count({
          where: { clinicId }
        }),
        // Total clinic revenue
        prisma.payment.aggregate({
          where: { clinicId },
          _sum: { amount: true }
        }),
        // Recent payments count (last 7 days)
        prisma.payment.count({
          where: {
            clinicId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      stats = {
        patients: patientCount,
        payments: recentPayments,
        income: Math.round(totalPayments._sum.amount || 0)
      };
    }

    return NextResponse.json(stats);
  } catch (err) {
    console.error("💥 Dashboard stats error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
