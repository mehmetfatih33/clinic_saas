import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "documents"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { patientId, name, type, url, size } = await req.json();

    if (!patientId || !name || !type) {
      return NextResponse.json({ message: "Hasta, belge adı ve türü zorunludur." }, { status: 400 });
    }

    // Use provided size or mock if missing (should be provided by client upload)
    const fileSize = size ? parseInt(size) : Math.floor(Math.random() * 5000) + 100;

    const document = await prisma.document.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        name,
        type,
        url: url || "https://example.com/document.pdf", // Default mock URL if not provided
        size: fileSize,
        uploadedById: session.user.id,
      },
      include: {
        patient: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(document);
  } catch (error: any) {
    console.error("❌ Document Create Error:", error);
    return NextResponse.json({ message: "Belge oluşturulurken bir hata oluştu." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "documents"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { searchParams } = new URL(req.url);
    // Add filters if needed

    const documents = await prisma.document.findMany({
      where: {
        clinicId: session.user.clinicId,
      },
      include: {
        patient: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, items: documents ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Document Fetch Error:", error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}
