import { Router } from "express";
import {
  createMaintenanceActivityHandler,
  listMaintenanceActivitiesHandler,
  updateMaintenanceActivityHandler,
} from "../controllers/maintenanceActivityController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("manager", "admin", "treasurer"),
  requireSociety,
);

router.get("/", listMaintenanceActivitiesHandler);
router.post("/", createMaintenanceActivityHandler);
router.patch("/:id", updateMaintenanceActivityHandler);

export default router;
