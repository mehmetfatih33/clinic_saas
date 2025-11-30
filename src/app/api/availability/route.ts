import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const specialistId = searchParams.get("specialistId");
    const dateStr = searchParams.get("date");
    const durationStr = searchParams.get("duration") || "60";
    const duration = Math.max(15, Math.min(240, parseInt(durationStr || "60", 10) || 60));

    if (!specialistId || !dateStr) {
      return NextResponse.json({ message: "Uzman ve tarih zorunludur" }, { status: 400 });
    }

    const specialist = await prisma.user.findFirst({
      where: { id: specialistId, clinicId: session.user.clinicId },
      select: { id: true },
    });
    if (!specialist) {
      return NextResponse.json({ message: "Uzman bulunamadı" }, { status: 404 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { workSchedule: true },
    });

    const d = new Date(`${dateStr}T00:00:00.000Z`);
    const weekday = d.getUTCDay(); // 0=Sun
    const map: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat"> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
    const key = map[weekday];
    const ws: any = clinic?.workSchedule || {};
    const open = ws?.[key]?.open || "08:00";
    const close = ws?.[key]?.close || "18:00";
    const closed = ws?.[key]?.closed === true;
    if (closed) return NextResponse.json([]);

    const [oh, om] = open.split(":").map((x: string) => parseInt(x, 10));
    const [ch, cm] = close.split(":").map((x: string) => parseInt(x, 10));
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    const lastStart = closeMinutes - duration;

    // Fetch specialist appointments for that day
    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endDate = new Date(`${dateStr}T23:59:59.999Z`);
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: session.user.clinicId,
        specialistId,
        status: "SCHEDULED" as any,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, duration: true },
    });

    const timeOffs = await prisma.specialistTimeOff.findMany({
      where: {
        clinicId: session.user.clinicId,
        specialistId,
        start: { lte: endDate },
        OR: [
          { end: { gte: startDate } },
          { end: null },
        ],
      },
      select: { start: true, end: true },
    });

    const slots: { time: string; status: "busy" | "free" }[] = [];
    for (let t = openMinutes; t <= lastStart; t += duration) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const slotStart = new Date(`${dateStr}T${time}:00.000Z`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // Overlap with appointments
      const overlapsAppointment = appointments.some((a) => {
        const aStart = new Date(a.date);
        const aEnd = new Date(aStart.getTime() + (a.duration || 60) * 60000);
        return aStart < slotEnd && aEnd > slotStart;
      });

      // Overlap with timeoffs
      const overlapsTimeOff = timeOffs.some((to) => {
        const s = new Date(to.start);
        const e = to.end ? new Date(to.end) : null;
        return e ? s < slotEnd && e > slotStart : s <= slotStart; // open-ended
      });

      slots.push({ time, status: overlapsAppointment || overlapsTimeOff ? "busy" : "free" });
    }

    return NextResponse.json(slots);
  } catch (err: any) {
    console.error("❌ Availability Error:", err);
    return NextResponse.json({ message: "Uygunluk hesaplanırken hata oluştu" }, { status: 500 });
  }
}

