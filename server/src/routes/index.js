import { Router } from "express";
import authRoutes from "./auth.js";
import masterDataRoutes from "./masterData.js";
import onboardingRoutes from "./onboarding.js";
import profileRoutes from "./profile.js";
import setupRoutes from "./setup.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/setup", setupRoutes);
router.use("/master-data", masterDataRoutes);
router.use("/profile", profileRoutes);

export default router;
