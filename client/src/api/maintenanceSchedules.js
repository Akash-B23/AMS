import { apiFetch } from "./client";

export function listMaintenanceSchedules({ isActive } = {}) {
  const params = new URLSearchParams();
  if (isActive !== undefined) params.set("isActive", String(isActive));
  const qs = params.toString();
  return apiFetch(`/api/maintenance-schedules${qs ? `?${qs}` : ""}`);
}

export function createMaintenanceSchedule(body) {
  return apiFetch("/api/maintenance-schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMaintenanceSchedule(id, body) {
  return apiFetch(`/api/maintenance-schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
