import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getCurrentClinicPlan } from "@/lib/features";

export async function GET() {
  try {
    const session = await requireSession();
    const cp = await getCurrentClinicPlan(session.user.clinicId);
    if (!cp) return NextResponse.json({ message: "Aktif plan bulunamadı" }, { status: 404 });
    return NextResponse.json({ slug: cp.plan.slug, features: cp.plan.features });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
    }
    return NextResponse.json({ message: "Plan bilgisi alınamadı" }, { status: 500 });
  }
}
