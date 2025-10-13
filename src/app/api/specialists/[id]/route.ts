import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Await params for Next.js 15+
    const { id } = await params;

    const specialist = await prisma.user.findUnique({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
      include: {
        specialist: true,
      },
    });

    if (!specialist) {
      return NextResponse.json({ message: "Uzman bulunamadı" }, { status: 404 });
    }

    const patients = await prisma.patient.findMany({
      where: {
        assignedToId: specialist.id,
        clinicId: session.user.clinicId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        totalSessions: true,
        totalPayments: true,
        createdAt: true,
      },
    });

    // Fetch payment history for this specialist
    const payments = await prisma.payment.findMany({
      where: {
        specialistId: specialist.id,
        clinicId: session.user.clinicId,
      },
      include: {
        patient: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Last 20 payments
    });

    // Calculate actual revenue from specialist's cut (not total payments)
    const actualTotalRevenue = payments.reduce((acc: number, p: any) => acc + p.specialistCut, 0);
    const totalPatients = patients.length;
    const avgRevenue = totalPatients > 0 ? actualTotalRevenue / totalPatients : 0;

    return NextResponse.json({
      id: specialist.id,
      name: specialist.name,
      email: specialist.email,
      specialist: {
        branch: specialist.specialist?.branch ?? "Belirtilmemiş",
        defaultShare: specialist.specialist?.defaultShare ?? 50,
        hourlyFee: (specialist.specialist as any)?.hourlyFee ?? 0,
        bio: specialist.specialist?.bio ?? "",
        totalPatients,
        totalRevenue: actualTotalRevenue, // Use actual specialist revenue
        avgRevenue,
      },
      patients,
      payments,
    });
  } catch (error) {
    console.error("❌ Uzman detayı alınamadı:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}