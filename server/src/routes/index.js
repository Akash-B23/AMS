import { Router } from "express";
import authRoutes from "./auth.js";
import complaintsRoutes from "./complaints.js";
import invoicesRoutes from "./invoices.js";
import jobsRoutes from "./jobs.js";
import masterDataRoutes from "./masterData.js";
import onboardingRoutes from "./onboarding.js";
import profileRoutes from "./profile.js";
import residentBillingRoutes from "./residentBilling.js";
import residentComplaintsRoutes from "./residentComplaints.js";
import setupRoutes from "./setup.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/setup", setupRoutes);
router.use("/master-data", masterDataRoutes);
router.use("/profile", profileRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/resident/complaints", residentComplaintsRoutes);
router.use("/resident", residentBillingRoutes);
router.use("/complaints", complaintsRoutes);
router.use("/jobs", jobsRoutes);

export default router;
