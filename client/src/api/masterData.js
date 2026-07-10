import { apiFetch } from "./client";

export async function getSummary() {
  return apiFetch("/api/master-data/summary");
}

export async function listFlats() {
  return apiFetch("/api/master-data/flats");
}

export async function importFlats(rows) {
  return apiFetch("/api/master-data/flats/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function importMaintenance(rows) {
  return apiFetch("/api/master-data/maintenance/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function listAmenities() {
  return apiFetch("/api/master-data/amenities");
}

export async function importAmenities(rows) {
  return apiFetch("/api/master-data/amenities/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}
