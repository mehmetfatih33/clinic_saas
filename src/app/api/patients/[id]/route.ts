import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * 🔹 GET /api/patients/[id]
 * Hasta detayını getirir (kullanıcı + uzman bilgisi birlikte)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
    }

    const whereClause: any = {
      id,
      clinicId: session.user.clinicId 
    };

    // Uzmanlar sadece kendi hastalarını görebilir
    if (session.user.role === "UZMAN") {
      whereClause.assignedToId = session.user.id;
    }

    const patient = await prisma.patient.findFirst({
      where: whereClause,
      include: {
        specialist: {
          include: {
            specialist: true
          }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!patient) {
      return NextResponse.json(
        { message: "Hasta bulunamadı. Lütfen geçerli bir hasta seçin." },
        { status: 404 }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("❌ Hasta detay hatası:", error);
    return NextResponse.json(
      { message: "Hasta bilgileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." },
      { status: 500 }
    );
  }
}

/**
 * 🔹 PATCH /api/patients/[id]
 * Hasta bilgilerini günceller (sadece ADMIN ve ASISTAN)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
    }

    // Sadece ADMIN ve ASISTAN düzenleyebilir
    if (!["ADMIN", "ASISTAN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Bu işlem için yetkiniz yok. Sadece yönetici ve asistanlar hastayı düzenleyebilir." }, { status: 403 });
    }

    const data = await req.json();

    // Hasta bilgilerini güncelle
    const updatedPatient = await prisma.patient.update({
      where: { 
        id,
        clinicId: session.user.clinicId 
      },
      data: {
        name: data.name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        reference: data.reference || undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        diagnosis: data.diagnosis || undefined,
        specialistShare: data.specialistShare ? parseFloat(data.specialistShare) : undefined,
        // Uzman değişikliği için özel mantık
        ...(data.assignedToId !== undefined && {
          assignedToId: data.assignedToId || null
        })
      },
      include: {
        specialist: {
          include: {
            specialist: true
          }
        }
      },
    });

    // Eğer uzman değişikliği varsa hasta sayılarını güncelle
    if (data.oldAssignedToId !== data.assignedToId) {
      // Eski uzmanın hasta sayısını azalt
      if (data.oldAssignedToId) {
        try {
          await prisma.specialistProfile.update({
            where: { userId: data.oldAssignedToId },
            data: { totalPatients: { decrement: 1 } }
          });
        } catch (error) {
          console.error("⚠️ Eski uzman hasta sayısı güncellenemedi:", error);
        }
      }

      // Yeni uzmanın hasta sayısını artır
      if (data.assignedToId) {
        try {
          await prisma.specialistProfile.update({
            where: { userId: data.assignedToId },
            data: { totalPatients: { increment: 1 } }
          });
        } catch (error) {
          console.error("⚠️ Yeni uzman hasta sayısı güncellenemedi:", error);
        }
      }
    }

    // Log update
    try {
      await prisma.auditLog.create({
        data: {
          clinicId: session.user.clinicId,
          actorId: session.user.id,
          action: "PATIENT_UPDATE",
          entity: "Patient",
          entityId: updatedPatient.id,
          meta: {
            changes: data,
            message: `Hasta bilgileri güncellendi: ${updatedPatient.name}`,
          },
        },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error("❌ Hasta güncelleme hatası:", error);
    return NextResponse.json(
      { message: "Hasta bilgileri güncellenirken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}