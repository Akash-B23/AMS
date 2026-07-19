import { apiFetch } from "./client";

export function listNotifications({ limit, offset } = {}) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return apiFetch(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "POST" });
}
