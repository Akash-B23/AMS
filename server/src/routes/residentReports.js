import { Router } from "express";
import {
  residentInvoicesHandler,
  residentSummaryHandler,
} from "../controllers/reportController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("resident", "tenant"), requireSociety);

router.get("/summary", residentSummaryHandler);
router.get("/invoices", residentInvoicesHandler);

export default router;
