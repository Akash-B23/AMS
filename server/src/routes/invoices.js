import { Router } from "express";
import {
  generateInvoicesHandler,
  listInvoicesHandler,
  markPaidHandler,
  pendingDuesHandler,
  rejectPaymentHandler,
  runRemindersHandler,
  verifyPaymentHandler,
} from "../controllers/invoiceController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "treasurer"), requireSociety);

router.post("/generate", generateInvoicesHandler);
router.get("/dues", pendingDuesHandler);
router.get("/", listInvoicesHandler);
router.post("/:id/mark-paid", markPaidHandler);
router.post("/:id/verify-payment", verifyPaymentHandler);
router.post("/:id/reject-payment", rejectPaymentHandler);
router.post("/reminders", runRemindersHandler);

export default router;
