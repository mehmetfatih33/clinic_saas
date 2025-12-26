import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ensureRole } from "@/lib/authz";
import { hasFeature } from "@/lib/features";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "tasks"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);

    const { title, description, priority, dueDate, assignedToId } = await req.json();

    if (!title) {
      return NextResponse.json({ message: "Başlık zorunludur." }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        clinicId: session.user.clinicId,
        title,
        description,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        createdById: session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Notify assigned user
    if (assignedToId && task.assignedTo?.email) {
      console.log("🔔 Notification triggered for:", task.assignedTo.email);
      
      // 1. Send Email
      try {
         await sendEmail(
           task.assignedTo.email,
           `Yeni Görev Atandı: ${title}`,
           `<div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Merhaba ${task.assignedTo.name || "Kullanıcı"},</h2>
              <p>Size yeni bir görev atandı.</p>
              <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Başlık:</strong> ${title}</p>
                <p><strong>Öncelik:</strong> ${priority || "MEDIUM"}</p>
                <p><strong>Son Tarih:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString("tr-TR") : "Belirtilmedi"}</p>
                ${description ? `<p><strong>Açıklama:</strong> ${description}</p>` : ""}
              </div>
              <p>Lütfen panele giriş yaparak detayları inceleyiniz.</p>
            </div>`
         );
         console.log("✅ Email sent to:", task.assignedTo.email);
      } catch (e) {
        console.error("❌ Mail send error:", e);
      }

      // 2. Create Notification
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: assignedToId,
            title: "Yeni Görev Atandı",
            message: `${title} başlıklı görev size atandı.`,
            type: "TASK",
            link: "/tasks",
          }
        });
        console.log("✅ Notification created:", notif.id);
      } catch (e) {
        console.error("❌ Notification create error:", e);
      }
    } else {
        console.log("⚠️ No notification sent. assignedToId:", assignedToId, "Email:", task.assignedTo?.email);
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("❌ Task Create Error:", error);
    return NextResponse.json({ message: "Görev oluşturulurken bir hata oluştu." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!(await hasFeature(session.user.clinicId, "tasks"))) {
      return NextResponse.json({ message: "Bu özellik paketinizde aktif değil" }, { status: 403 });
    }
    ensureRole(session, ["ADMIN", "ASISTAN", "UZMAN"]);
    
    const { searchParams } = new URL(req.url);
    const assignedToMe = searchParams.get('assignedToMe');

    let whereClause: any = { clinicId: session.user.clinicId };

    if (assignedToMe === 'true') {
      whereClause.assignedToId = session.user.id;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, items: tasks ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Task Fetch Error:", error);
    return NextResponse.json({ ok: false, error: String(error), items: [] }, { status: 200 });
  }
}
