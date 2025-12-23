import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { patientId, specialistId, roomId, date, duration, notes } = await req.json();

    console.log("📅 Appointment creation request:", { patientId, specialistId, roomId, date, duration, notes });

    if (!patientId || !specialistId || !roomId || !date) {
      return NextResponse.json({ message: "Eksik bilgi. Lütfen hasta, uzman, oda ve tarihi doldurun." }, { status: 400 });
    }

    // UZMAN kısıtları: sadece kendi adına ve kendi hastalarına randevu
    if (session.user.role === "UZMAN") {
      if (specialistId !== session.user.id) {
        return NextResponse.json({ message: "Uzman sadece kendi adına randevu oluşturabilir." }, { status: 403 });
      }
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId: session.user.clinicId },
        select: { assignedToId: true },
      });
      if (!patient) {
        return NextResponse.json({ message: "Hasta bulunamadı." }, { status: 404 });
      }
      if (patient.assignedToId !== session.user.id) {
        return NextResponse.json({ message: "Uzman sadece kendisine atanmış hastalara randevu oluşturabilir." }, { status: 403 });
      }
    }

    // Tatil günleri kontrolü
    const start = new Date(date);
    const conflicts = await prisma.specialistTimeOff.findMany({
      where: {
        clinicId: session.user.clinicId,
        specialistId,
        start: { lte: start },
        OR: [
          { end: { gte: start } },
          { end: null },
        ],
      },
      take: 1,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ message: "Uzmanın tatil gününde randevu oluşturulamaz" }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, clinicId: session.user.clinicId, isActive: true },
    });
    if (!room) {
      return NextResponse.json({ message: "Oda bulunamadı veya aktif değil" }, { status: 404 });
    }

    const effectiveDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? duration : 60;
    const end = new Date(start.getTime() + effectiveDuration * 60000);
    const windowStart = new Date(start.getTime() - 240 * 60000);

    const overlaps = await prisma.appointment.findMany({
      where: {
        clinicId: session.user.clinicId,
        status: "SCHEDULED",
        roomId,
        date: { gte: windowStart, lte: end },
      },
      select: { id: true, date: true, duration: true },
      take: 5,
    });

    for (const a of overlaps) {
      const aStart = new Date(a.date);
      const aEnd = new Date(aStart.getTime() + a.duration * 60000);
      if (aStart < end && aEnd > start) {
        return NextResponse.json({ message: "Seçilen saatte oda dolu. Lütfen başka saat/oda seçin." }, { status: 409 });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        specialistId,
        roomId,
        date: start,
        duration: effectiveDuration,
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
    return NextResponse.json({ message: "Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let whereClause: any =
      session.user.role === "UZMAN"
        ? { specialistId: session.user.id, clinicId: session.user.clinicId }
        : { clinicId: session.user.clinicId };

    if (from || to) {
      const range: any = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      whereClause = { ...whereClause, date: range };
    } else if (dateFilter) {
      const startDate = new Date(dateFilter + 'T00:00:00.000Z');
      const endDate = new Date(dateFilter + 'T23:59:59.999Z');
      whereClause = { ...whereClause, date: { gte: startDate, lte: endDate } };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ ok: true, items: appointments ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Appointment Fetch Error:", error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}
