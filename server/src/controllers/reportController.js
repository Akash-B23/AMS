import {
  getResidentInvoiceReport,
  getResidentReportSummary,
  getStaffCollectionReport,
  getStaffComplaintsReport,
  getStaffExpenseReport,
  getStaffIncomeExpenseReport,
  getStaffMaintenanceReport,
  getStaffPendingDuesReport,
} from "../services/reportService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function residentSummaryHandler(req, res) {
  const result = await getResidentReportSummary(
    req.user.societyId,
    req.user.id,
  );
  if (result.error === "not_found") {
    res.status(404).json({ error: result.message ?? "Not found" });
    return;
  }
  res.json(result);
}

export async function residentInvoicesHandler(req, res) {
  const result = await getResidentInvoiceReport(
    req.user.societyId,
    req.user.id,
    req.query,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: result.message ?? "Not found" });
    return;
  }
  res.json(result);
}

export async function collectionReportHandler(req, res) {
  const result = await getStaffCollectionReport(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function expenseReportHandler(req, res) {
  const result = await getStaffExpenseReport(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function complaintsReportHandler(req, res) {
  const result = await getStaffComplaintsReport(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function maintenanceReportHandler(req, res) {
  const result = await getStaffMaintenanceReport(req.user.societyId);
  res.json(result);
}

export async function pendingDuesReportHandler(req, res) {
  const result = await getStaffPendingDuesReport(
    req.user.societyId,
    req.query,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function incomeExpenseReportHandler(req, res) {
  const result = await getStaffIncomeExpenseReport(
    req.user.societyId,
    req.query,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}
