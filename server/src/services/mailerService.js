import { Resend } from "resend";
import { createEmailDelivery } from "../db/queries/emailDeliveries.js";

function getFromAddress() {
  return process.env.EMAIL_FROM || "AMS <noreply@ams.local>";
}

/**
 * Send an email via Resend and record the delivery.
 * When RESEND_API_KEY is missing, records status=skipped (dev/test-safe).
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();
  const deliveryPayload = {
    ...payload,
    subject,
    text,
    from,
  };

  if (!apiKey) {
    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      status: "skipped",
      error: "RESEND_API_KEY not configured",
      payload: deliveryPayload,
    });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html: html ?? undefined,
    });

    if (error) {
      return createEmailDelivery(client, {
        societyId,
        userId,
        toEmail: to,
        template,
        status: "failed",
        error: error.message ?? String(error),
        payload: deliveryPayload,
      });
    }

    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      providerMessageId: data?.id ?? null,
      status: "sent",
      payload: deliveryPayload,
    });
  } catch (err) {
    return createEmailDelivery(client, {
      societyId,
      userId,
      toEmail: to,
      template,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      payload: deliveryPayload,
    });
  }
}

export function buildInvoiceReminderEmail({ societyName, residentName, amount, billingPeriod, flatLabel, dueDate }) {
  const subject = `Maintenance reminder — ${societyName}`;
  const text = `Dear ${residentName}, your maintenance of ₹${amount} for ${billingPeriod} (flat ${flatLabel}) is due on ${dueDate}.`;
  const html = `<p>Dear ${residentName},</p><p>Your maintenance of <strong>₹${amount}</strong> for <strong>${billingPeriod}</strong> (flat ${flatLabel}) is due on <strong>${dueDate}</strong>.</p>`;
  return { subject, text, html };
}

export function buildMaintenanceDueEmail({ societyName, title, activityDate, category }) {
  const subject = `Maintenance due — ${title}`;
  const text = `${societyName}: scheduled maintenance "${title}" (${category}) is due on ${activityDate}.`;
  const html = `<p>${societyName}</p><p>Scheduled maintenance <strong>${title}</strong> (${category}) is due on <strong>${activityDate}</strong>.</p>`;
  return { subject, text, html };
}
