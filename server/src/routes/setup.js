import { Router } from "express";
import {
  completeHandler,
  createBlockHandler,
  importFlatsHandler,
  listFlatsHandler,
  maintenanceHandler,
  statusHandler,
} from "../controllers/setupController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin"), requireSociety);

router.get("/status", statusHandler);
router.get("/flats", listFlatsHandler);
router.post("/blocks", createBlockHandler);
router.post("/flats/import", importFlatsHandler);
router.put("/maintenance", maintenanceHandler);
router.post("/complete", completeHandler);

export default router;
