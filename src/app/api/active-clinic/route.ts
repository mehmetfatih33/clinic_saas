import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";

export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));
  const { clinicId } = body as { clinicId?: string };
  if (!clinicId || !Array.isArray(session.user.clinicIds) || !session.user.clinicIds.includes(clinicId)) {
    return NextResponse.json({ message: "Geçersiz klinik" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_clinic_id", clinicId, { path: "/", httpOnly: false });
  return res;
}
