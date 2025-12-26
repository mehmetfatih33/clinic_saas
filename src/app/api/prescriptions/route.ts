import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "prescriptions"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { patientId, diagnosis, notes, items } = await req.json();

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Hasta ve en az bir ilaç seçilmelidir." }, { status: 400 });
    }

    const prescription = await prisma.prescription.create({
      data: {
        clinicId: session.user.clinicId,
        patientId,
        specialistId: session.user.id, // Current user is the specialist (or admin creating it)
        diagnosis,
        notes,
        items: {
          create: items.map((item: any) => ({
            medication: item.medication,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
          })),
        },
      },
      include: {
        patient: { select: { id: true, name: true } },
        items: true,
        specialist: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(prescription);
  } catch (error: any) {
    console.error("❌ Prescription Create Error:", error);
    return NextResponse.json({ message: "Reçete oluşturulurken bir hata oluştu." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "prescriptions"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { searchParams } = new URL(req.url);
    // Add filters if needed

    const prescriptions = await prisma.prescription.findMany({
      where: {
        clinicId: session.user.clinicId,
      },
      include: {
        patient: { select: { id: true, name: true } },
        specialist: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, items: prescriptions ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Prescription Fetch Error:", error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}
