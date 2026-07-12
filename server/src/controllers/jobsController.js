import {
  generateInvoicesForAllSocieties,
  runRemindersForAllSocieties,
  runRemindersForSociety,
} from "../services/invoiceService.js";
import {
  handleCashfreeWebhook,
  verifyWebhookSignature,
} from "../services/paymentService.js";

export async function cashfreeWebhookHandler(req, res) {
  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : "");

  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const result = await handleCashfreeWebhook(event);
  if (!result.ok && result.error === "payment_not_found") {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (!result.ok) {
    res.status(400).json({ error: result.error ?? "Webhook failed" });
    return;
  }
  res.json({ received: true, ...result });
}

export async function monthlyInvoicesJobHandler(_req, res) {
  const result = await generateInvoicesForAllSocieties();
  res.json(result);
}

export async function remindersJobHandler(req, res) {
  if (req.user?.societyId) {
    const result = await runRemindersForSociety(
      req.user.societyId,
      req.user.id,
    );
    res.json(result);
    return;
  }

  const result = await runRemindersForAllSocieties();
  res.json(result);
}
