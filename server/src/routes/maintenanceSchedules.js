import { Router } from "express";
import {
  createMaintenanceScheduleHandler,
  listMaintenanceSchedulesHandler,
  updateMaintenanceScheduleHandler,
} from "../controllers/maintenanceScheduleController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("manager", "admin", "treasurer"),
  requireSociety,
);

router.get("/", listMaintenanceSchedulesHandler);
router.post("/", createMaintenanceScheduleHandler);
router.patch("/:id", updateMaintenanceScheduleHandler);

export default router;
