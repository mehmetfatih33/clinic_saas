import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    const { id } = await params;

    // Only notes authored by specialist in same clinic
    const notes = await prisma.note.findMany({
      where: { clinicId: session.user.clinicId, authorId: id },
      select: {
        id: true,
        content: true,
        visibility: true,
        createdAt: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(notes);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { patientId, content, visibility } = body as { patientId: string; content: string; visibility?: "PRIVATE" | "INTERNAL" };

    if (!patientId || !content) {
      return NextResponse.json({ message: "Hasta ve içerik zorunlu" }, { status: 400 });
    }

    // UZMAN sadece kendi adına not oluşturabilir
    if (session.user.role === "UZMAN" && session.user.id !== id) {
      return NextResponse.json({ message: "FORBIDDEN" }, { status: 403 });
    }

    // Validate patient belongs to same clinic
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.user.clinicId } });
    if (!patient) return NextResponse.json({ message: "Hasta bulunamadı" }, { status: 404 });

    const note = await prisma.note.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        authorId: id,
        content,
        visibility: (visibility as any) || "PRIVATE",
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Server error" }, { status: 500 });
  }
}

