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

    console.log("📅 Fetching appointments for patient:", patientId);

    // Build where clause based on user role
    let whereClause: any = {
      patientId,
      clinicId: session.user.clinicId,
    };

    // If UZMAN role, only show their own appointments
    if (session.user.role === "UZMAN") {
      whereClause.specialistId = session.user.id;
    }

    // Fetch appointments without includes to avoid type issues
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
    });

    // Manually fetch related data
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const specialist = await prisma.user.findUnique({
          where: { id: appointment.specialistId },
          select: {
            id: true,
            name: true,
            specialist: {
              select: {
                branch: true,
              },
            },
          },
        });

        const sessionNotes = await prisma.note.findMany({
          where: { appointmentId: appointment.id },
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        });

        return {
          ...appointment,
          specialist,
          sessionNotes,
        };
      })
    );

    // Sort by date descending
    enrichedAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ Found ${enrichedAppointments.length} appointments for patient ${patientId}`);
    return NextResponse.json(enrichedAppointments);
  } catch (error: any) {
    console.error("❌ Patient Appointments Fetch Error:", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}