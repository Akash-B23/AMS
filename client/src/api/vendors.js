import { apiFetch } from "./client";

export function listVendors({ activeOnly } = {}) {
  const params = new URLSearchParams();
  if (activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  return apiFetch(`/api/vendors${qs ? `?${qs}` : ""}`);
}

export function createVendor(body) {
  return apiFetch("/api/vendors", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateVendor(id, body) {
  return apiFetch(`/api/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
