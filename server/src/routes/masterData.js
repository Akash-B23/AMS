import { Router } from "express";
import {
  importAmenitiesHandler,
  importFlatsHandler,
  importMaintenanceHandler,
  listAmenitiesHandler,
  listFlatsHandler,
  summaryHandler,
} from "../controllers/masterDataController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("manager", "admin"), requireSociety);

router.get("/summary", summaryHandler);
router.get("/flats", listFlatsHandler);
router.post("/flats/import", importFlatsHandler);
router.post("/maintenance/import", importMaintenanceHandler);
router.get("/amenities", listAmenitiesHandler);
router.post("/amenities/import", importAmenitiesHandler);

export default router;
