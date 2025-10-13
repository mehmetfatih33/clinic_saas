import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN"]);

    const { patientId, specialistId, date, duration, notes } = await req.json();

    console.log("📅 Appointment creation request:", { patientId, specialistId, date, duration, notes });

    if (!patientId || !specialistId || !date) {
      return NextResponse.json({ message: "Eksik veri" }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        specialistId,
        date: new Date(date),
        duration: duration ?? 60,
        notes: notes ?? null,
      },
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
    });

    console.log("✅ Appointment created successfully:", appointment.id);
    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("❌ Appointment Create Error:", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');

    let whereClause: any =
      session.user.role === "UZMAN"
        ? { specialistId: session.user.id, clinicId: session.user.clinicId }
        : { clinicId: session.user.clinicId };

    // Add date filtering if provided
    if (dateFilter) {
      const startDate = new Date(dateFilter + 'T00:00:00.000Z');
      const endDate = new Date(dateFilter + 'T23:59:59.999Z');
      whereClause = {
        ...whereClause,
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error("❌ Appointment Fetch Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}