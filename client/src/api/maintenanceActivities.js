import { apiFetch } from "./client";

export function listMaintenanceActivities({ status, category } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  const qs = params.toString();
  return apiFetch(`/api/maintenance-activities${qs ? `?${qs}` : ""}`);
}

export function createMaintenanceActivity(body) {
  return apiFetch("/api/maintenance-activities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMaintenanceActivity(id, body) {
  return apiFetch(`/api/maintenance-activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
