import { Router } from "express";
import {
  residentDuesHandler,
  residentSubmitPaymentHandler,
} from "../controllers/invoiceController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("resident", "tenant"), requireSociety);

router.get("/dues", residentDuesHandler);
router.post("/invoices/:id/submit-payment", residentSubmitPaymentHandler);

export default router;
