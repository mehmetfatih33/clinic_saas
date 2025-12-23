import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Await params for Next.js 15+
    const { id } = await params;

    const specialist = await prisma.user.findFirst({
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
      phone: specialist.phone ?? null,
      address: (specialist as any).address ?? null,
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check role permissions
    if (session.user.role !== "ADMIN" && session.user.role !== "ASISTAN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Await params for Next.js 15+
    const { id } = await params;
    const body = await req.json();

    // Verify specialist belongs to same clinic
    const specialist = await prisma.user.findFirst({
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

    if (!specialist.specialist) {
      const createdProfile = await prisma.specialistProfile.create({
        data: {
          clinicId: session.user.clinicId,
          userId: specialist.id,
          defaultShare: 50,
          hourlyFee: 0,
        },
      });
      specialist.specialist = createdProfile;
    }

    // Prepare update data for SpecialistProfile
    const updateData: any = {};
    
    if (body.hourlyFee !== undefined) {
      updateData.hourlyFee = Number(body.hourlyFee);
    }
    
    if (body.defaultShare !== undefined) {
      updateData.defaultShare = Number(body.defaultShare);
    }

    if (body.branch !== undefined) {
      updateData.branch = body.branch;
    }

    if (body.bio !== undefined) {
      updateData.bio = body.bio;
    }

    // Update specialist profile
    const updatedProfile = await prisma.specialistProfile.update({
      where: {
        id: specialist.specialist.id,
      },
      data: updateData,
    });

    // Optionally update User fields
    const userUpdate: any = {};
    if (body.name !== undefined) userUpdate.name = body.name;
    
    if (body.email !== undefined) {
      if (body.email !== specialist.email) {
         const existing = await prisma.user.findUnique({ where: { email: body.email } });
         if (existing) {
           return NextResponse.json({ message: "Bu e-posta adresi zaten kullanımda" }, { status: 409 });
         }
      }
      userUpdate.email = body.email;
    }

    if (body.phone !== undefined) userUpdate.phone = body.phone;
    if (body.address !== undefined) userUpdate.address = body.address ?? null;
    
    if (body.password && body.password.length >= 6) {
      userUpdate.passwordHash = await hash(body.password, 10);
    }

    let updatedUser = specialist;
    if (Object.keys(userUpdate).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: specialist.id },
        data: userUpdate,
        include: { specialist: true },
      });
    }

    return NextResponse.json({
      success: true,
      specialist: {
        ...updatedUser,
        specialist: updatedProfile,
      },
    });
  } catch (error) {
    console.error("❌ Uzman güncellenemedi:", error);
    return NextResponse.json({ message: "Güncelleme başarısız" }, { status: 500 });
  }
}
