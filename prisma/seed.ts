// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Klinik
  const clinic = await prisma.clinic.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Demo Klinik", slug: "default" },
  });

  // Admin (default local)
  const admin = await prisma.user.upsert({
    where: { email: "admin@klinik.com" },
    update: {},
    create: {
      email: "admin@klinik.com",
      name: "Admin",
      role: "ADMIN",
      clinicId: clinic.id,
      passwordHash: await hash("admin123", 10),
    },
  });

  // Additional Admin (as requested)
  await prisma.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: {
      email: "admin@clinic.local",
      name: "Admin",
      role: "ADMIN",
      clinicId: clinic.id,
      passwordHash: await hash("admin123", 10),
    },
  });

  // Uzman
  const uzman = await prisma.user.upsert({
    where: { email: "uzman@klinik.com" },
    update: {},
    create: {
      email: "uzman@klinik.com",
      name: "Uzm. Psikolog X",
      role: "UZMAN",
      clinicId: clinic.id,
      passwordHash: await hash("uzman123", 10),
    },
  });

  // SpecialistProfile for uzman
  const specialistProfile = await prisma.specialistProfile.upsert({
    where: { userId: uzman.id },
    update: {},
    create: {
      userId: uzman.id,
      clinicId: clinic.id,
      branch: "Klinik Psikoloji",
      bio: "Uzman profili"
    },
  });

  // Asistan (default local)
  await prisma.user.upsert({
    where: { email: "asistan@klinik.com" },
    update: {},
    create: {
      email: "asistan@klinik.com",
      name: "Asistan",
      role: "ASISTAN",
      clinicId: clinic.id,
      passwordHash: await hash("asistan123", 10),
    },
  });

  // Additional Asistan (as requested)
  await prisma.user.upsert({
    where: { email: "asistan@clinic.local" },
    update: {},
    create: {
      email: "asistan@clinic.local",
      name: "Asistan",
      role: "ASISTAN",
      clinicId: clinic.id,
      passwordHash: await hash("asistan123", 10),
    },
  });

  // Master ücret
  const bireysel = await prisma.feeSchedule.upsert({
    where: { clinicId_title: { clinicId: clinic.id, title: "Bireysel Seans" } },
    update: {},
    create: { clinicId: clinic.id, title: "Bireysel Seans", amount: 150000, createdBy: admin.id },
  });

  // Uzman override (1400₺, 45/55)
  await prisma.specialistFee.upsert({
    where: { specialistId_feeId: { specialistId: specialistProfile.id, feeId: bireysel.id } },
    update: { customAmount: 140000, splitClinic: 45, splitDoctor: 55, clinicId: clinic.id },
    create: { specialistId: specialistProfile.id, feeId: bireysel.id, customAmount: 140000, splitClinic: 45, splitDoctor: 55, clinicId: clinic.id },
  });

  // Hasta + atama
  const patient = await prisma.patient.create({
    data: { 
      clinicId: clinic.id, 
      name: "Ayşe Yılmaz", 
      phone: "5551112233", 
      assignedToId: uzman.id, 
      specialistShare: 55.0
    },
  });
  const asg = await prisma.assignment.create({
    data: { clinicId: clinic.id, patientId: patient.id, specialistId: uzman.id, feeId: bireysel.id }
  });

  console.log({ clinic: clinic.slug, admin: admin.email, uzman: uzman.email, assignment: asg.id });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });