import {
  generateInvoices,
  getInvoiceList,
  getPendingDues,
  getResidentDues,
  markInvoicePaidOffline,
  rejectResidentPayment,
  runRemindersForSociety,
  submitResidentPayment,
  verifyResidentPayment,
} from "../services/invoiceService.js";

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
  if (result.error === "awaiting_verification") {
    res.status(409).json({
      error: "Invoice has a payment awaiting verification — verify or reject it first",
    });
    return;
  }
  if (result.error === "not_pending") {
    res.status(409).json({ error: "Invoice is not pending" });
    return;
  }
  res.json(result);
}

export async function verifyPaymentHandler(req, res) {
  const result = await verifyResidentPayment(
    req.user.societyId,
    req.user.id,
    req.params.id,
  );
  if (result.error === "not_found") {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (result.error === "no_submission") {
    res.status(409).json({ error: "No payment submission to verify" });
    return;
  }
  if (result.error === "not_pending") {
    res.status(409).json({ error: "Invoice is not pending" });
    return;
  }
  res.json(result);
}

export async function rejectPaymentHandler(req, res) {
  const result = await rejectResidentPayment(
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
  if (result.error === "no_submission") {
    res.status(409).json({ error: "No payment submission to reject" });
    return;
  }
  if (result.error === "not_pending") {
    res.status(409).json({ error: "Invoice is not pending" });
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

export async function residentSubmitPaymentHandler(req, res) {
  const result = await submitResidentPayment(
    req.user.id,
    req.user.societyId,
    req.params.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
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
  if (result.error === "already_submitted") {
    res.status(409).json({
      error: "A payment is already awaiting verification for this invoice",
    });
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
