import { Router } from "express";
import authRoutes from "./auth.js";
import invoicesRoutes from "./invoices.js";
import jobsRoutes from "./jobs.js";
import masterDataRoutes from "./masterData.js";
import onboardingRoutes from "./onboarding.js";
import profileRoutes from "./profile.js";
import residentBillingRoutes from "./residentBilling.js";
import setupRoutes from "./setup.js";
import societiesRoutes from "./societies.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/setup", setupRoutes);
router.use("/master-data", masterDataRoutes);
router.use("/profile", profileRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/resident", residentBillingRoutes);
router.use("/societies", societiesRoutes);
router.use("/jobs", jobsRoutes);

export default router;
