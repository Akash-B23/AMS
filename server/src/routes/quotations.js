import { Router } from "express";
import {
  approveQuotationHandler,
  createQuotationHandler,
  listQuotationsHandler,
  rejectQuotationHandler,
} from "../controllers/quotationController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "treasurer"), requireSociety);

router.get("/", listQuotationsHandler);
router.post("/", createQuotationHandler);
router.post("/:id/approve", approveQuotationHandler);
router.post("/:id/reject", rejectQuotationHandler);

export default router;
