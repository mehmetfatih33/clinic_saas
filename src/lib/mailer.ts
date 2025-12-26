import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export async function sendEmail(
  to: string | string[], 
  subject: string, 
  html: string,
  config?: SmtpConfig
): Promise<void> {
  const host = config?.host || process.env.SMTP_HOST || "";
  const port = config?.port || Number(process.env.SMTP_PORT || 0);
  const user = config?.user || process.env.SMTP_USER || "";
  const pass = config?.pass || process.env.SMTP_PASS || "";
  const from = config?.from || process.env.SMTP_FROM || user || "";

  if (!host || !port || !user || !pass || !from) {
    console.warn("[mailer] SMTP env eksik, e-posta gönderimi atlandı", { to, subject });
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
}
