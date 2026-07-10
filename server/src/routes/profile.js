import { Router } from "express";
import {
  addVehicleHandler,
  deleteVehicleHandler,
  getProfileHandler,
  updateProfileHandler,
  updateVehicleHandler,
} from "../controllers/profileController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("resident", "tenant"), requireSociety);

router.get("/me", getProfileHandler);
router.put("/me", updateProfileHandler);
router.post("/me/vehicles", addVehicleHandler);
router.put("/me/vehicles/:id", updateVehicleHandler);
router.delete("/me/vehicles/:id", deleteVehicleHandler);

export default router;
