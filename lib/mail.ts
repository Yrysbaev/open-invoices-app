import nodemailer from "nodemailer";

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export async function sendMailWithAttachment(params: {
  to: string;
  subject: string;
  text: string;
  filename: string;
  content: Buffer;
}) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const from =
    process.env.MAIL_FROM?.trim() ||
    `Open Invoices <${user}>`;

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    attachments: [
      {
        filename: params.filename,
        content: params.content,
      },
    ],
  });
}
