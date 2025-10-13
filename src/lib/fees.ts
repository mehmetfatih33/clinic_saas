// src/lib/fees.ts
// import { prisma } from "@/lib/prisma"; // TODO: Enable when database is connected

export async function resolveFeeForAppointment(_opts: { assignmentId: string }) {
  // TODO: Implement when database is connected
  // 1) Assignment (hasta özel)
  // 2) SpecialistFee (uzman default override)
  // 3) Klinik master + 50/50
  
  // Placeholder implementation
  return { amount: 150000, splitClinic: 50, splitDoctor: 50 };
}