import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "default-clinic" },
    update: { name: "Default Klinik", slug: "default" },
    create: { id: "default-clinic", name: "Default Klinik", slug: "default" },
  });

  await prisma.user.create({
    data: {
      email: "admin@admin.com",
      name: "Sistem Admin",
      role: "ADMIN",
      clinicId: clinic.id,
      passwordHash: await hash("Admin1234", 10),
    },
  });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
