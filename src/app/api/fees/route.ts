import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function GET() {
  const session = await requireSession();
  
  // TODO: Replace with actual database query when connected
  // const fees = await prisma.feeSchedule.findMany({
  //   where: { clinicId: session.user.clinicId },
  //   orderBy: { createdAt: "desc" },
  //   select: { id: true, title: true, amount: true },
  // });
  
  const fees = [
    {
      id: "1",
      title: "Standart Seans Ücreti",
      amount: 150000
    },
    {
      id: "2", 
      title: "İlk Değerlendirme",
      amount: 200000
    },
    {
      id: "3",
      title: "Grup Terapisi",
      amount: 100000
    },
    {
      id: "4",
      title: "Online Konsültasyon",
      amount: 120000
    }
  ];
  
  return NextResponse.json(fees);
}