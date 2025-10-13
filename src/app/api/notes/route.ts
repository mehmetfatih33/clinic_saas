import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { NoteVisibility } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { patientId, content, appointmentId, visibility } = await req.json();

    console.log("📝 Note creation request:", { patientId, content: content?.substring(0, 50), appointmentId, visibility });
    console.log("👤 User session:", { id: session.user.id, role: session.user.role, clinicId: session.user.clinicId });

    if (!patientId || !content) {
      return NextResponse.json({ message: "Eksik veri" }, { status: 400 });
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
          { message: "Bu hastaya erişim yetkiniz yok" },
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
      },
    });

    console.log("✅ Note created successfully:", note.id);
    return NextResponse.json(note);
  } catch (err: any) {
    console.error("❌ Note Create Error:", err);
    console.error("Error details:", err.message);
    console.error("Stack trace:", err.stack);
    return NextResponse.json({ message: "Server Error", error: err.message }, { status: 500 });
  }
}
