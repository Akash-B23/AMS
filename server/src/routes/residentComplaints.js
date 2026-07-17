import { Router } from "express";
import {
  createResidentComplaintHandler,
  getResidentComplaintHandler,
  listResidentComplaintsHandler,
} from "../controllers/complaintController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("resident", "tenant"), requireSociety);

router.get("/", listResidentComplaintsHandler);
router.post("/", createResidentComplaintHandler);
router.get("/:id", getResidentComplaintHandler);

export default router;
