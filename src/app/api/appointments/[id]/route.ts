import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { id } = await params;
    const { status, date, duration, notes } = await req.json();

    console.log("🔄 Appointment update request:", { id, status, date, duration, notes });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (date) updateData.date = new Date(date);
    if (duration !== undefined) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    console.log("✅ Appointment updated successfully:", updated.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("❌ Appointment Update Error:", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}