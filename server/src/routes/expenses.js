import { Router } from "express";
import {
  createExpenseHandler,
  listExpensesHandler,
} from "../controllers/expenseController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "treasurer"), requireSociety);

router.get("/", listExpensesHandler);
router.post("/", createExpenseHandler);

export default router;
