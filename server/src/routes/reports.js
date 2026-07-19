import { Router } from "express";
import {
  complaintsReportHandler,
  collectionReportHandler,
  expenseReportHandler,
  incomeExpenseReportHandler,
  maintenanceReportHandler,
  pendingDuesReportHandler,
} from "../controllers/reportController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireSociety);

router.get(
  "/collection",
  requireRole("admin", "treasurer"),
  collectionReportHandler,
);
router.get(
  "/expenses",
  requireRole("admin", "treasurer"),
  expenseReportHandler,
);
router.get(
  "/pending-dues",
  requireRole("admin", "treasurer"),
  pendingDuesReportHandler,
);
router.get(
  "/income-expense",
  requireRole("admin", "treasurer"),
  incomeExpenseReportHandler,
);
router.get(
  "/complaints",
  requireRole("manager", "admin", "association_staff"),
  complaintsReportHandler,
);
router.get(
  "/maintenance",
  requireRole("manager", "admin", "treasurer", "association_staff"),
  maintenanceReportHandler,
);

export default router;
