import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { patientId, type, message, scheduledFor } = await req.json();

    if (!message || !scheduledFor || !type) {
      return NextResponse.json({ message: "Eksik bilgi. Mesaj, tarih ve tip zorunludur." }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: patientId || null,
        type,
        message,
        scheduledFor: new Date(scheduledFor),
        status: "PENDING",
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(reminder);
  } catch (error: any) {
    console.error("❌ Reminder Create Error:", error);
    return NextResponse.json({ message: "Hatırlatıcı oluşturulurken bir hata oluştu." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { searchParams } = new URL(req.url);
    // Add filters if needed

    const reminders = await prisma.reminder.findMany({
      where: {
        clinicId: session.user.clinicId,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { scheduledFor: "asc" },
    });

    return NextResponse.json({ ok: true, items: reminders ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Reminder Fetch Error:", error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}
