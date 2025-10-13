import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { demoStorage } from '@/lib/demo-storage';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    // If UZMAN, only show their assigned patients
    const whereClause = userRole === "UZMAN" 
      ? { 
          clinicId: session?.user?.clinicId ?? "demo-clinic",
          assignedToId: userId  // Only their patients
        }
      : { 
          clinicId: session?.user?.clinicId ?? "demo-clinic"  // All clinic patients for ADMIN/ASISTAN
        };

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: { specialist: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
    }

    const data = await req.json();

    console.log("📥 Hasta kaydı isteği:", data);
    console.log("🏥 Kullanıcı oturumu:", session?.user);

    // Gerekli alanları kontrol et
    if (!data.name || !data.assignedToId) {
      return NextResponse.json(
        { message: "Hasta adı ve uzman seçimi zorunludur." },
        { status: 400 }
      );
    }

    // Kayıt oluştur
    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        reference: data.reference || null,
        specialistShare: parseFloat(data.specialistShare || "50"),
        assignedToId: data.assignedToId,
        clinicId: session.user.clinicId || "demo-clinic", // 🌟 BURASI ÖNEMLİ
      },
    });

    // ✅ UZMAN HASTA SAYISINI GÜNCELLE
    if (data.assignedToId) {
      try {
        await prisma.specialistProfile.update({
          where: { userId: data.assignedToId },
          data: {
            totalPatients: {
              increment: 1
            }
          }
        });
        console.log("📊 Uzman hasta sayısı güncellendi:", data.assignedToId);
      } catch (error) {
        console.error("⚠️ Uzman hasta sayısı güncellenemedi:", error);
        // Don't fail the patient creation if specialist count update fails
      }
    }

    console.log("✅ Hasta başarıyla kaydedildi:", patient);
    return NextResponse.json(patient);
  } catch (error) {
    console.error("❌ Hasta oluşturulurken hata:", error);
    return NextResponse.json(
      { message: "Hasta kaydedilemedi", error: String(error) },
      { status: 500 }
    );
  }
}