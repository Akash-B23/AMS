import { Router } from "express";
import {
  getPaymentsSettingsHandler,
  updatePaymentsSettingsHandler,
} from "../controllers/invoiceController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "treasurer"), requireSociety);

router.get("/me/payments", getPaymentsSettingsHandler);
router.patch("/me/payments", updatePaymentsSettingsHandler);

export default router;
