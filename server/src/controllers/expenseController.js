import {
  createSocietyExpense,
  getExpenses,
} from "../services/expenseService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listExpensesHandler(req, res) {
  const result = await getExpenses(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function createExpenseHandler(req, res) {
  const result = await createSocietyExpense(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: result.message ?? "Not found" });
    return;
  }
  res.status(201).json(result);
}
