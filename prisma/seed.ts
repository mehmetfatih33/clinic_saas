// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Önce tüm kullanıcıları temizle
  console.log("🧹 Mevcut kullanıcılar temizleniyor...");
  await prisma.user.deleteMany({});
  await prisma.specialistProfile.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.feeSchedule.deleteMany({});
  await prisma.specialistFee.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.verificationToken.deleteMany({});

  // Klinik
  const clinic = await prisma.clinic.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Demo Klinik", slug: "default" },
  });

  console.log("👤 Admin kullanıcısı oluşturuluyor...");
  // Admin kullanıcısı
  const admin = await prisma.user.create({
    data: {
      email: "admin@klinik.com",
      name: "Admin",
      role: "ADMIN",
      clinicId: clinic.id,
      passwordHash: await hash("admin123", 10),
    },
  });

  console.log("👤 Asistan kullanıcısı oluşturuluyor...");
  // Asistan kullanıcısı
  const asistan = await prisma.user.create({
    data: {
      email: "asistan@klinik.com",
      name: "Asistan",
      role: "ASISTAN",
      clinicId: clinic.id,
      passwordHash: await hash("asistan123", 10),
    },
  });

  console.log("💰 Temel ücret tarifesi oluşturuluyor...");
  // Master ücret
  const bireysel = await prisma.feeSchedule.create({
    data: { clinicId: clinic.id, title: "Bireysel Seans", amount: 150000, createdBy: admin.id },
  });

  console.log("✅ Seed işlemi tamamlandı!");
  console.log("📋 Oluşturulan kullanıcılar:");
  console.log(`   👑 Admin: ${admin.email} / admin123`);
  console.log(`   👤 Asistan: ${asistan.email} / asistan123`);
  console.log(`   🏥 Klinik: ${clinic.name} (${clinic.slug})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });