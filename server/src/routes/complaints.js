import { Router } from "express";
import {
  listSocietyComplaintsHandler,
  updateSocietyComplaintHandler,
} from "../controllers/complaintController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("manager", "admin"), requireSociety);

router.get("/", listSocietyComplaintsHandler);
router.patch("/:id", updateSocietyComplaintHandler);

export default router;
