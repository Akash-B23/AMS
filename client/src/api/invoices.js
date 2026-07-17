import { apiFetch } from "./client";

export function getResidentDues() {
  return apiFetch("/api/resident/dues");
}

export function submitPayment(invoiceId, body) {
  return apiFetch(`/api/resident/invoices/${invoiceId}/submit-payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function generateInvoices(body = {}) {
  return apiFetch("/api/invoices/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getPendingDues({ blockId, overdueOnly } = {}) {
  const params = new URLSearchParams();
  if (blockId) params.set("blockId", blockId);
  if (overdueOnly) params.set("overdueOnly", "true");
  const qs = params.toString();
  return apiFetch(`/api/invoices/dues${qs ? `?${qs}` : ""}`);
}

export function listInvoices(query = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.billingPeriod) params.set("billingPeriod", query.billingPeriod);
  if (query.blockId) params.set("blockId", query.blockId);
  const qs = params.toString();
  return apiFetch(`/api/invoices${qs ? `?${qs}` : ""}`);
}

export function markInvoicePaid(invoiceId, body) {
  return apiFetch(`/api/invoices/${invoiceId}/mark-paid`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verifyPayment(invoiceId) {
  return apiFetch(`/api/invoices/${invoiceId}/verify-payment`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function rejectPayment(invoiceId, body = {}) {
  return apiFetch(`/api/invoices/${invoiceId}/reject-payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function runReminders() {
  return apiFetch("/api/invoices/reminders", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
