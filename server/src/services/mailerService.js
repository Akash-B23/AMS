import nodemailer from "nodemailer";
import { Resend } from "resend";
import { createEmailDelivery } from "../db/queries/emailDeliveries.js";

function getFromAddress() {
  return process.env.EMAIL_FROM || "AMS <noreply@ams.local>";
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function createSmtpTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER || undefined,
            pass: process.env.SMTP_PASS || undefined,
          }
        : undefined,
  });
}

async function deliverViaSmtp({ to, subject, text, html, from }) {
  const transporter = createSmtpTransport();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html ?? undefined,
  });
  return { providerMessageId: info.messageId ?? null };
}

async function deliverViaResend({ to, subject, text, html, from }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
    html: html ?? undefined,
  });
  if (error) {
    throw new Error(error.message ?? String(error));
  }
  return { providerMessageId: data?.id ?? null };
}

/**
 * Send an email and record the delivery.
 * Transport order: SMTP (if SMTP_HOST) → Resend (if RESEND_API_KEY) → skipped.
 */
export async function sendEmail(
  client,
  {
    societyId,
    userId = null,
    to,
    subject,
    text,
    html = null,
    template,
    payload = {},
  },
) {
  const from = getFromAddress();
  const deliveryPayload = {
    ...payload,
    subject,
    text,
    from,
  };

  const useSmtp = smtpConfigured();
  const useResend = !useSmtp && resendConfigured();

  if (!useSmtp && !useResend) {
    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      status: "skipped",
      error: "No email transport configured (set SMTP_HOST or RESEND_API_KEY)",
      payload: deliveryPayload,
    });
  }

  try {
    const result = useSmtp
      ? await deliverViaSmtp({ to, subject, text, html, from })
      : await deliverViaResend({ to, subject, text, html, from });

    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      providerMessageId: result.providerMessageId,
      status: "sent",
      payload: {
        ...deliveryPayload,
        transport: useSmtp ? "smtp" : "resend",
      },
    });
  } catch (err) {
    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      payload: {
        ...deliveryPayload,
        transport: useSmtp ? "smtp" : "resend",
      },
    });
  }
}

export function buildInvoiceReminderEmail({
  societyName,
  residentName,
  amount,
  billingPeriod,
  flatLabel,
  dueDate,
}) {
  const subject = `Maintenance reminder — ${societyName}`;
  const text = `Dear ${residentName}, your maintenance of ₹${amount} for ${billingPeriod} (flat ${flatLabel}) is due on ${dueDate}.`;
  const html = `<p>Dear ${residentName},</p><p>Your maintenance of <strong>₹${amount}</strong> for <strong>${billingPeriod}</strong> (flat ${flatLabel}) is due on <strong>${dueDate}</strong>.</p>`;
  return { subject, text, html };
}

export function buildMaintenanceDueEmail({
  societyName,
  title,
  activityDate,
  category,
}) {
  const subject = `Maintenance due — ${title}`;
  const text = `${societyName}: scheduled maintenance "${title}" (${category}) is due on ${activityDate}.`;
  const html = `<p>${societyName}</p><p>Scheduled maintenance <strong>${title}</strong> (${category}) is due on <strong>${activityDate}</strong>.</p>`;
  return { subject, text, html };
}
