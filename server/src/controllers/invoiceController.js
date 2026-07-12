import {
  generateInvoices,
  getInvoiceList,
  getPendingDues,
  getResidentDues,
  getSocietyPaymentsSettings,
  markInvoicePaidOffline,
  runRemindersForSociety,
  updateSocietyPaymentsSettings,
} from "../services/invoiceService.js";
import { createResidentPaymentOrder } from "../services/paymentService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function generateInvoicesHandler(req, res) {
  const result = await generateInvoices(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function pendingDuesHandler(req, res) {
  const result = await getPendingDues(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function listInvoicesHandler(req, res) {
  const result = await getInvoiceList(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function markPaidHandler(req, res) {
  const result = await markInvoicePaidOffline(
    req.user.societyId,
    req.user.id,
    req.params.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (result.error === "not_pending") {
    res.status(409).json({ error: "Invoice is not pending" });
    return;
  }
  res.json(result);
}

export async function getPaymentsSettingsHandler(req, res) {
  const result = await getSocietyPaymentsSettings(req.user.societyId);
  if (result.error === "not_found") {
    res.status(404).json({ error: "Society not found" });
    return;
  }
  res.json(result);
}

export async function updatePaymentsSettingsHandler(req, res) {
  const result = await updateSocietyPaymentsSettings(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function residentDuesHandler(req, res) {
  const result = await getResidentDues(req.user.id, req.user.societyId);
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  res.json(result);
}

export async function residentPayHandler(req, res) {
  const result = await createResidentPaymentOrder(
    req.user.id,
    req.user.societyId,
    req.params.id,
  );
  if (result.error === "cashfree_not_configured") {
    res.status(503).json({ error: "Online payments are not configured" });
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  if (result.error === "vendor_missing") {
    res.status(400).json({
      error: "Society Cashfree vendor is not configured",
    });
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (result.error === "forbidden") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (result.error === "not_pending") {
    res.status(409).json({ error: "Invoice is not pending" });
    return;
  }
  if (result.error === "cashfree_order_failed") {
    res.status(502).json({ error: result.message ?? "Payment order failed" });
    return;
  }
  res.json(result);
}

export async function runRemindersHandler(req, res) {
  const result = await runRemindersForSociety(
    req.user.societyId,
    req.user.id,
  );
  res.json(result);
}
