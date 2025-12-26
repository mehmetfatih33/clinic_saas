
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma Patient Creation...');
    
    // 1. Get a clinic ID (demo-clinic or first available)
    let clinic = await prisma.clinic.findFirst();
    if (!clinic) {
      console.log('No clinic found, creating one...');
      clinic = await prisma.clinic.create({
        data: { name: 'Test Clinic', slug: 'test-clinic' }
      });
    }
    console.log('Using Clinic:', clinic.id);

    // 2. Try to create a patient with birthDate
    const patient = await prisma.patient.create({
      data: {
        name: 'Test Patient',
        phone: '05551234567',
        clinicId: clinic.id,
        birthDate: new Date(), // This is the field in question
        diagnosis: 'Test Diagnosis'
      }
    });

    console.log('✅ Patient created successfully:', patient);
  } catch (e) {
    console.error('❌ Error creating patient:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
