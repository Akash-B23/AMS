import { apiFetch } from "./client";

export async function login(societySlug, email, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ societySlug, email, password }),
  });
}

export async function platformLogin(email, password) {
  return apiFetch("/api/auth/platform/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return apiFetch("/api/auth/me");
}
