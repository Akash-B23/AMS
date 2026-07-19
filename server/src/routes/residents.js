import { Router } from "express";
import {
  listResidentsHandler,
  moveInHandler,
  moveOutHandler,
} from "../controllers/residentOccupancyController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireSociety);

router.get(
  "/",
  requireRole("admin", "manager", "treasurer"),
  listResidentsHandler,
);

router.post("/", requireRole("admin", "manager"), moveInHandler);

router.post(
  "/:id/move-out",
  requireRole("admin", "manager"),
  moveOutHandler,
);

export default router;
