import {
  approveQuotation,
  createSocietyQuotation,
  getQuotations,
  rejectQuotation,
} from "../services/quotationService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listQuotationsHandler(req, res) {
  const result = await getQuotations(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function createQuotationHandler(req, res) {
  const result = await createSocietyQuotation(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: result.message ?? "Not found" });
    return;
  }
  res.status(201).json(result);
}

export async function approveQuotationHandler(req, res) {
  const result = await approveQuotation(
    req.user.societyId,
    req.user.id,
    req.params.id,
  );
  if (result.error === "not_found") {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  if (result.error === "invalid_transition") {
    res.status(409).json({ error: "Invalid status transition" });
    return;
  }
  res.json(result);
}

export async function rejectQuotationHandler(req, res) {
  const result = await rejectQuotation(
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
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  if (result.error === "invalid_transition") {
    res.status(409).json({ error: "Invalid status transition" });
    return;
  }
  res.json(result);
}
