import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Yetkisiz erişim' }, { status: 401 });
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

    return NextResponse.json({ ok: true, items: patients ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Yetkisiz erişim. Lütfen giriş yapın." }, { status: 401 });
    }

    const data = await req.json();

    console.log("📥 Hasta kaydı isteği:", data);
    console.log("🏥 Kullanıcı oturumu:", session?.user);

    // Gerekli alanları kontrol et
    const name = (data.name || '').trim();
    const phone = (data.phone || '').trim();
    const fee = data.fee !== undefined ? parseFloat(String(data.fee)) : NaN;
    const phoneRegex = /^\+?\d{10,15}$/u;

    if (!name) {
      return NextResponse.json(
        { message: "Ad Soyad zorunludur." },
        { status: 400 }
      );
    }

    if (!phone || !phoneRegex.test(phone)) {
      return NextResponse.json(
        { message: "Telefon zorunludur ve geçerli formatta olmalıdır. (Örn: +905551234567)" },
        { status: 400 }
      );
    }

    if (!data.assignedToId) {
      return NextResponse.json(
        { message: "Uzman seçimi zorunludur." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fee) || fee <= 0) {
      return NextResponse.json(
        { message: "Ücret zorunludur ve 0'dan büyük olmalıdır." },
        { status: 400 }
      );
    }

    // Kayıt oluştur
    const patient = await prisma.patient.create({
      data: {
        name,
        email: data.email || null,
        phone,
        address: data.address || null,
        reference: data.reference || null,
        fee,
        specialistShare: parseFloat(data.specialistShare || "50"),
        assignedToId: data.assignedToId,
        clinicId: session.user.clinicId || "demo-clinic", // 🌟 BURASI ÖNEMLİ
      },
    });

    // ✅ UZMAN HASTA SAYISINI GÜNCELLE
    try {
      if (data.assignedToId) {
        await prisma.specialistProfile.update({
          where: { userId: data.assignedToId },
          data: { totalPatients: { increment: 1 } },
        });
      }

      // Log kaydı oluştur
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PATIENT_CREATE",
          entity: "Patient",
          entityId: patient.id,
          meta: {
            name: patient.name,
            phone: patient.phone,
            assignedToId: patient.assignedToId,
            message: `Yeni hasta oluşturuldu: ${patient.name}`,
          },
        },
      });
    } catch (error) {
      console.error("Error updating specialist stats or logging:", error);
    }

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("❌ Hasta oluşturulurken hata:", error);
    return NextResponse.json(
      { message: "Hasta kaydedilirken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
