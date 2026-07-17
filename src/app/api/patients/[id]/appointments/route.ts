import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: patientId } = await params;

    let whereClause: any = {
      patientId,
      clinicId: session.user.clinicId,
    };

    // If UZMAN role, only show their own appointments
    if (session.user.role === "UZMAN") {
      whereClause.specialistId = session.user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        specialist: {
          select: {
            id: true,
            name: true,
            specialist: {
              select: {
                branch: true,
              },
            },
          },
        },
        sessionNotes: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error("❌ Patient Appointments Fetch Error:", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}
