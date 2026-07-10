import { apiFetch } from "./client";

export async function getSetupStatus() {
  return apiFetch("/api/setup/status");
}

export async function listFlats() {
  return apiFetch("/api/setup/flats");
}

export async function createBlock(name) {
  return apiFetch("/api/setup/blocks", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function importFlats(rows) {
  return apiFetch("/api/setup/flats/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function updateMaintenance(amounts) {
  return apiFetch("/api/setup/maintenance", {
    method: "PUT",
    body: JSON.stringify({ amounts }),
  });
}

export async function completeSetup() {
  return apiFetch("/api/setup/complete", { method: "POST" });
}
