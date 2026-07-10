import { apiFetch } from "./client";

export async function checkSlug(slug) {
  return apiFetch(`/api/onboarding/check-slug?slug=${encodeURIComponent(slug)}`);
}

export async function signup(data) {
  return apiFetch("/api/onboarding/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
