import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { NoteVisibility } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const baseWhere = patientId
      ? { patientId, clinicId: session.user.clinicId }
      : { clinicId: session.user.clinicId };

    const whereClause =
      session.user.role === "ADMIN"
        ? baseWhere
        : {
            ...baseWhere,
            OR: [
              { visibility: NoteVisibility.INTERNAL },
              { authorId: session.user.id },
            ],
          };

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, role: true } },
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
      take: patientId ? undefined : 50,
    });

    return NextResponse.json(notes);
  } catch (err) {
    console.error("❌ Note Fetch Error:", err);
    return NextResponse.json(
      { message: "Notlar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { patientId, content, appointmentId, visibility } = await req.json();

    console.log("📝 Note creation request:", { patientId, content: content?.substring(0, 50), appointmentId, visibility });
    console.log("👤 User session:", { id: session.user.id, role: session.user.role, clinicId: session.user.clinicId });

    if (!patientId || !content) {
      return NextResponse.json({ message: "Eksik bilgi. Lütfen not içeriğini girin." }, { status: 400 });
    }

    // Check if user has access to this patient
    if (session.user.role === "UZMAN") {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          assignedToId: session.user.id,
          clinicId: session.user.clinicId,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { message: "Bu hastaya erişim yetkiniz yok. Sadece atanmış uzmanlar not ekleyebilir." },
          { status: 403 }
        );
      }
    }

    const note = await prisma.note.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        authorId: session.user.id,
        appointmentId: appointmentId ?? null,
        content,
        visibility: visibility ? (visibility as NoteVisibility) : NoteVisibility.PRIVATE,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true } },
      },
    });

    console.log("✅ Note created successfully:", note.id);
    return NextResponse.json(note);
  } catch (err: any) {
    console.error("❌ Note Create Error:", err);
    console.error("Error details:", err.message);
    console.error("Stack trace:", err.stack);
    return NextResponse.json({ message: "Not eklenirken bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}

// duplicate GET removed; handler above supports optional patientId
