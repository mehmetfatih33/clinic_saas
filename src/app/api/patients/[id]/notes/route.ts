import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { NoteVisibility } from "@prisma/client";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    // Build where clause based on role
    const whereClause =
      session.user.role === "ADMIN"
        ? { patientId: id, clinicId: session.user.clinicId }
        : {
            patientId: id,
            clinicId: session.user.clinicId,
            OR: [
              { visibility: NoteVisibility.INTERNAL },
              { authorId: session.user.id },
            ],
          };

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, role: true } },
        appointment: { select: { id: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (err) {
    console.error("❌ Note Fetch Error:", err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
