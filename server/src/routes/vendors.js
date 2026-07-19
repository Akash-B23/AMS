import { Router } from "express";
import {
  createVendorHandler,
  listVendorsHandler,
  updateVendorHandler,
} from "../controllers/vendorController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "treasurer"), requireSociety);

router.get("/", listVendorsHandler);
router.post("/", createVendorHandler);
router.patch("/:id", updateVendorHandler);

export default router;
