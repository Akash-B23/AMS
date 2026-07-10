import { apiFetch } from "./client";

export async function getMyProfile() {
  return apiFetch("/api/profile/me");
}

export async function updateMyProfile(data) {
  return apiFetch("/api/profile/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function addVehicle(data) {
  return apiFetch("/api/profile/me/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVehicle(id, data) {
  return apiFetch(`/api/profile/me/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVehicle(id) {
  return apiFetch(`/api/profile/me/vehicles/${id}`, {
    method: "DELETE",
  });
}
