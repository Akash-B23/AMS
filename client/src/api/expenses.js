import { apiFetch } from "./client";

export function listExpenses({ category } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const qs = params.toString();
  return apiFetch(`/api/expenses${qs ? `?${qs}` : ""}`);
}

export function createExpense(body) {
  return apiFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
