import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "room-tracking"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    const url = new URL(req.url);
    const all = url.searchParams.get("all");
    const dateStr = url.searchParams.get("date");
    const durationStr = url.searchParams.get("duration");
    const where = { clinicId: session.user.clinicId, ...(all ? {} : { isActive: true }) } as any;
    if (dateStr && durationStr) {
      const start = new Date(dateStr);
      const duration = parseInt(durationStr, 10);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(duration) || duration <= 0) {
        return NextResponse.json({ message: "Geçersiz tarih/süre" }, { status: 400 });
      }
      const end = new Date(start.getTime() + duration * 60000);
      const windowStart = new Date(start.getTime() - 240 * 60000);

      const appts = await prisma.appointment.findMany({
        where: {
          clinicId: session.user.clinicId,
          status: { not: "CANCELED" },
          roomId: { not: null },
          date: { gte: windowStart, lte: end },
        },
        select: { roomId: true, date: true, duration: true },
      });

      const busy = new Set<string>();
      for (const a of appts) {
        const aStart = new Date(a.date);
        const aEnd = new Date(aStart.getTime() + a.duration * 60000);
        if (aStart < end && aEnd > start && a.roomId) {
          busy.add(a.roomId);
        }
      }

      const allRooms = await prisma.room.findMany({
        where,
        orderBy: { name: "asc" },
      });
      const available = allRooms.filter((r: { id: string }) => !busy.has(r.id));
      return NextResponse.json({ ok: true, items: available ?? [] }, { status: 200 });
    } else {
      const rooms = await prisma.room.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ ok: true, items: rooms ?? [] }, { status: 200 });
    }
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    console.error("❌ Rooms Error:", err);
    return NextResponse.json({ ok: false, error: String(err), items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "room-tracking"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }

    // Check for multi-room limit
    const existingCount = await prisma.room.count({ where: { clinicId: session.user.clinicId } });
    if (existingCount >= 1) {
      if (!(await hasFeature(session.user.clinicId, "multi-room"))) {
        return NextResponse.json({ message: "Birden fazla oda eklemek için Çoklu Oda özelliği gereklidir." }, { status: 403 });
      }
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ message: "Geçerli bir oda adı girin" }, { status: 400 });
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ message: "Oda adı boş olamaz" }, { status: 400 });
    }
    const clinic = await prisma.clinic.findUnique({ where: { id: session.user.clinicId }, select: { id: true } });
    if (!clinic) {
      return NextResponse.json({ message: "Klinik bulunamadı" }, { status: 400 });
    }
    try {
      const created = await prisma.room.create({
        data: { clinicId: session.user.clinicId, name: trimmed }
      });
      return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json({ message: "Bu isimde bir oda zaten var" }, { status: 409 });
      }
      if (e?.code === "P2003") {
        return NextResponse.json({ message: "Geçersiz klinik ilişkisi" }, { status: 400 });
      }
      throw e;
    }
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    return NextResponse.json({ message: "Oda oluşturulamadı" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "room-tracking"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    const { id, name, isActive } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "Geçersiz oda" }, { status: 400 });
    }
    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(typeof name === "string" ? { name } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      }
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    return NextResponse.json({ message: "Oda güncellenemedi" }, { status: 500 });
  }
}
