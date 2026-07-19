import { apiFetch } from "./client";

export function getResidentSummary() {
  return apiFetch("/api/resident/reports/summary");
}

export function getResidentInvoices({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/api/resident/reports/invoices${qs ? `?${qs}` : ""}`);
}

export function getCollectionReport({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/api/reports/collection${qs ? `?${qs}` : ""}`);
}

export function getExpenseReport({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/api/reports/expenses${qs ? `?${qs}` : ""}`);
}

export function getComplaintsReport({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/api/reports/complaints${qs ? `?${qs}` : ""}`);
}

export function getMaintenanceReport() {
  return apiFetch("/api/reports/maintenance");
}

export function getPendingDuesReport({ billingPeriod } = {}) {
  const params = new URLSearchParams();
  if (billingPeriod) params.set("billingPeriod", billingPeriod);
  const qs = params.toString();
  return apiFetch(`/api/reports/pending-dues${qs ? `?${qs}` : ""}`);
}

export function getIncomeExpenseReport({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/api/reports/income-expense${qs ? `?${qs}` : ""}`);
}
