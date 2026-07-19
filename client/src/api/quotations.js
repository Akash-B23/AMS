import { apiFetch } from "./client";

export function listQuotations({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiFetch(`/api/quotations${qs ? `?${qs}` : ""}`);
}

export function createQuotation(body) {
  return apiFetch("/api/quotations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function approveQuotation(id) {
  return apiFetch(`/api/quotations/${id}/approve`, {
    method: "POST",
  });
}

export function rejectQuotation(id, body) {
  return apiFetch(`/api/quotations/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
