import { apiFetch } from "./client";

export function listMyComplaints() {
  return apiFetch("/api/resident/complaints");
}

export function getMyComplaint(id) {
  return apiFetch(`/api/resident/complaints/${id}`);
}

export function createComplaint(body) {
  return apiFetch("/api/resident/complaints", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listSocietyComplaints({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiFetch(`/api/complaints${qs ? `?${qs}` : ""}`);
}

export function updateComplaint(id, body) {
  return apiFetch(`/api/complaints/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
