import { apiFetch } from "./client";

export function listResidents({ blockId, active } = {}) {
  const params = new URLSearchParams();
  if (blockId) params.set("blockId", blockId);
  if (active === false) params.set("active", "false");
  if (active === true) params.set("active", "true");
  const qs = params.toString();
  return apiFetch(`/api/residents${qs ? `?${qs}` : ""}`);
}

export function moveInResident(body) {
  return apiFetch("/api/residents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function moveOutResident(id, body = {}) {
  return apiFetch(`/api/residents/${id}/move-out`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
