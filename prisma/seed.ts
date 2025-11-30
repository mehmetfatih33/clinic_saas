import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "default-clinic" },
    update: { name: "Default Klinik", slug: "default" },
    create: { id: "default-clinic", name: "Default Klinik", slug: "default" },
  });

  await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      email: "admin@admin.com",
      name: "Sistem Admin",
      role: "ADMIN",
      clinicId: clinic.id,
      passwordHash: await hash("Admin1234", 10),
    },
  });

  const uzman1 = await prisma.user.upsert({
    where: { email: "uzman1@clinic.dev" },
    update: {},
    create: {
      email: "uzman1@clinic.dev",
      name: "Demo Uzman 1",
      role: "UZMAN",
      clinicId: clinic.id,
      passwordHash: await hash("Uzman1234", 10),
    },
  });

  const uzman2 = await prisma.user.upsert({
    where: { email: "uzman2@clinic.dev" },
    update: {},
    create: {
      email: "uzman2@clinic.dev",
      name: "Demo Uzman 2",
      role: "UZMAN",
      clinicId: clinic.id,
      passwordHash: await hash("Uzman1234", 10),
    },
  });

  await prisma.specialistProfile.upsert({
    where: { userId: uzman1.id },
    update: {},
    create: {
      userId: uzman1.id,
      clinicId: clinic.id,
      branch: "Psikoloji",
      bio: "Demo uzman",
      defaultShare: 50,
      hourlyFee: 500,
    },
  });

  await prisma.specialistProfile.upsert({
    where: { userId: uzman2.id },
    update: {},
    create: {
      userId: uzman2.id,
      clinicId: clinic.id,
      branch: "Psikiyatri",
      bio: "Demo uzman",
      defaultShare: 50,
      hourlyFee: 600,
    },
  });

  const hasta1 = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      name: "Hasta Demo 1",
      email: "hasta1@example.com",
      phone: "5551112233",
      assignedToId: uzman1.id,
    },
  });

  const hasta2 = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      name: "Hasta Demo 2",
      email: "hasta2@example.com",
      phone: "5554445566",
      assignedToId: uzman2.id,
    },
  });

  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: hasta1.id,
      specialistId: uzman1.id,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 60,
      status: "SCHEDULED",
    },
  });

  await prisma.user.createMany({
    data: [
      { email: "uzman3@clinic.dev", name: "Demo Uzman 3", role: "UZMAN", clinicId: clinic.id, passwordHash: await hash("Uzman1234", 10) },
      { email: "uzman4@clinic.dev", name: "Demo Uzman 4", role: "UZMAN", clinicId: clinic.id, passwordHash: await hash("Uzman1234", 10) },
    ],
    skipDuplicates: true,
  });

  const uzman3 = await prisma.user.findUnique({ where: { email: "uzman3@clinic.dev" } });
  const uzman4 = await prisma.user.findUnique({ where: { email: "uzman4@clinic.dev" } });

  if (uzman3) {
    await prisma.specialistProfile.upsert({
      where: { userId: uzman3.id },
      update: {},
      create: { userId: uzman3.id, clinicId: clinic.id, branch: "Fizyoterapi", bio: "Demo uzman", defaultShare: 50, hourlyFee: 450 },
    });
  }

  if (uzman4) {
    await prisma.specialistProfile.upsert({
      where: { userId: uzman4.id },
      update: {},
      create: { userId: uzman4.id, clinicId: clinic.id, branch: "Diyetisyen", bio: "Demo uzman", defaultShare: 50, hourlyFee: 400 },
    });
  }

  await prisma.patient.createMany({
    data: [
      { clinicId: clinic.id, name: "Hasta Demo 3", email: "hasta3@example.com", phone: "5550001100", assignedToId: uzman1.id },
      { clinicId: clinic.id, name: "Hasta Demo 4", email: "hasta4@example.com", phone: "5550002200", assignedToId: uzman2.id },
      { clinicId: clinic.id, name: "Hasta Demo 5", email: "hasta5@example.com", phone: "5550003300", assignedToId: uzman3 ? uzman3.id : uzman1.id },
    ],
    skipDuplicates: true,
  });

  const now = Date.now();
  await prisma.appointment.createMany({
    data: [
      { clinicId: clinic.id, patientId: hasta1.id, specialistId: uzman1.id, date: new Date(now - 7 * 24 * 60 * 60 * 1000), duration: 60, status: "COMPLETED" },
      { clinicId: clinic.id, patientId: hasta1.id, specialistId: uzman1.id, date: new Date(now - 3 * 24 * 60 * 60 * 1000), duration: 60, status: "COMPLETED" },
      { clinicId: clinic.id, patientId: hasta1.id, specialistId: uzman1.id, date: new Date(now + 2 * 24 * 60 * 60 * 1000), duration: 60, status: "SCHEDULED" },
    ],
  });

  const amount1 = 500;
  const amount2 = 600;
  const share = 0.5;
  await prisma.payment.createMany({
    data: [
      { clinicId: clinic.id, patientId: hasta1.id, specialistId: uzman1.id, amount: amount1, specialistCut: amount1 * share, clinicCut: amount1 * (1 - share) },
      { clinicId: clinic.id, patientId: hasta1.id, specialistId: uzman1.id, amount: amount2, specialistCut: amount2 * share, clinicCut: amount2 * (1 - share) },
    ],
  });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
