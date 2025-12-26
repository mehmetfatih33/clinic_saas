import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";


// Global declaration for development to prevent duplicate cron jobs
const globalForCron = global as unknown as { cronJobsInitialized: boolean };

export function initCronJobs() {
  if (globalForCron.cronJobsInitialized) {
    console.log("⏰ Cron jobs already initialized, skipping...");
    return;
  }

  console.log("⏰ Cron jobs initialized...");
  globalForCron.cronJobsInitialized = true;

  // 1. Daily Schedule Email (Every day at 20:00)
  // "0 20 * * *" = At 20:00.
  cron.schedule("0 20 * * *", async () => {
    console.log("Running daily schedule cron...");
    await sendDailySchedules();
  });

  // 2. Appointment Reminders (Every 10 minutes)
  // Checks for appointments in the next 2 hours
  cron.schedule("*/10 * * * *", async () => {
    console.log("Running appointment reminder cron...");
    await sendAppointmentReminders();
  });
}

async function sendDailySchedules() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log(`Checking schedules for: ${tomorrow.toLocaleDateString()}`);

    // Find all specialists
    const specialists = await prisma.user.findMany({
      where: {
        role: "UZMAN",
      },
      include: {
        appointments: {
          where: {
            date: {
              gte: tomorrow,
              lte: tomorrowEnd,
            },
            status: "SCHEDULED",
          },
          include: {
            patient: true,
          },
          orderBy: {
            date: "asc",
          },
        },
      },
    });

    for (const specialist of specialists) {
      if (specialist.appointments.length > 0 && specialist.email) {
        console.log(`Sending schedule to ${specialist.name} (${specialist.email})`);
        
        const appointmentRows = specialist.appointments.map(app => {
          const time = new Date(app.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px;">${time}</td>
              <td style="padding: 10px;">${app.patient.name}</td>
              <td style="padding: 10px;">${app.notes || "-"}</td>
            </tr>
          `;
        }).join("");

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Merhaba ${specialist.name || "Sayın Uzman"},</h2>
            <p>Yarın (${tomorrow.toLocaleDateString("tr-TR")}) için randevu programınız aşağıdadır:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa; text-align: left;">
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Saat</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Hasta</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Notlar</th>
                </tr>
              </thead>
              <tbody>
                ${appointmentRows}
              </tbody>
            </table>
            
            <p style="margin-top: 20px;">İyi çalışmalar dileriz.</p>
          </div>
        `;

        await sendEmail(specialist.email, `Yarınki Randevu Programınız - ${tomorrow.toLocaleDateString("tr-TR")}`, html);
      }
    }
  } catch (error) {
    console.error("Error in daily schedule cron:", error);
  }
}

async function sendAppointmentReminders() {
  try {
    const now = new Date();
    // Look for appointments starting between 1h 50m and 2h 10m from now
    const startRange = new Date(now.getTime() + (110 * 60 * 1000)); // +1h 50m
    const endRange = new Date(now.getTime() + (130 * 60 * 1000));   // +2h 10m

    // Find appointments in this range
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startRange,
          lte: endRange,
        },
        status: "SCHEDULED",
      },
      include: {
        patient: true,
        clinic: true,
        specialist: true,
        reminders: {
          where: {
            type: "EMAIL",
          },
        },
      },
    });

    for (const app of appointments) {
      // Check if reminder already sent
      if (app.reminders.length > 0) {
        continue;
      }

      if (app.patient.email) {
        console.log(`Sending reminder to patient ${app.patient.name} for appointment at ${app.date}`);

        const timeString = new Date(app.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        const dateString = new Date(app.date).toLocaleDateString("tr-TR");

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Randevu Hatırlatması</h2>
            <p>Sayın <strong>${app.patient.name}</strong>,</p>
            <p>Bugün saat <strong>${timeString}</strong>'de (${dateString}) <strong>${app.specialist.name}</strong> ile randevunuz bulunmaktadır.</p>
            <p>Randevunuza vaktinde gelmenizi rica ederiz.</p>
            <br/>
            <p><em>${app.clinic.name}</em></p>
          </div>
        `;

        const smtpConfig = (app.clinic as any).smtpHost ? {
          host: (app.clinic as any).smtpHost,
          port: (app.clinic as any).smtpPort || 587,
          user: (app.clinic as any).smtpUser,
          pass: (app.clinic as any).smtpPass,
          from: (app.clinic as any).smtpFrom || (app.clinic as any).smtpUser,
        } : undefined;

        await sendEmail(app.patient.email, "Randevu Hatırlatması", html, smtpConfig);

        // Record the reminder
        await prisma.reminder.create({
          data: {
            clinicId: app.clinicId,
            patientId: app.patientId,
            appointmentId: app.id,
            type: "EMAIL",
            status: "SENT",
            scheduledFor: app.date, // Originally scheduled for the appointment time, or now? 
                                  // The schema says 'scheduledFor', usually means when the reminder should be sent. 
                                  // But here we are sending it now. Let's use 'now' or the appointment time. 
                                  // Using 'now' makes more sense for "when this reminder was meant to be".
            sentAt: new Date(),
            message: "2 saat kala hatırlatması",
          },
        });
      }
    }
  } catch (error) {
    console.error("Error in appointment reminder cron:", error);
  }
}

async function processPendingReminders() {
  try {
    const now = new Date();
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: now },
      },
      include: { patient: true, clinic: true },
    });

    for (const reminder of pendingReminders) {
      let sent = false;
      
      const smtpConfig = (reminder.clinic as any).smtpHost ? {
        host: (reminder.clinic as any).smtpHost,
        port: (reminder.clinic as any).smtpPort || 587,
        user: (reminder.clinic as any).smtpUser,
        pass: (reminder.clinic as any).smtpPass,
        from: (reminder.clinic as any).smtpFrom || (reminder.clinic as any).smtpUser,
      } : undefined;

      if (reminder.type === "EMAIL" && reminder.patient?.email) {
        await sendEmail(reminder.patient.email, "Hatırlatma", reminder.message, smtpConfig);
        sent = true;
      } else if (reminder.type === "WHATSAPP" && reminder.patient?.phone) {
        // WhatsApp logic
      }

      if (sent) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "SENT", sentAt: new Date() },
        });
      }
    }
  } catch (error) {
    console.error("Error processing pending reminders:", error);
  }
}
