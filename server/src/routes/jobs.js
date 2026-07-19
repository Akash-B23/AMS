import { Router } from "express";
import {
  maintenanceSchedulesJobHandler,
  monthlyInvoicesJobHandler,
  remindersJobHandler,
} from "../controllers/jobsController.js";
import { requireAuth, requireRole, requireSociety } from "../middleware/auth.js";
import { requireCronSecret } from "../middleware/cronAuth.js";

const router = Router();

router.post("/monthly-invoices", requireCronSecret, monthlyInvoicesJobHandler);

router.post(
  "/maintenance-schedules",
  requireCronSecret,
  maintenanceSchedulesJobHandler,
);

router.post("/reminders", (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (secret && auth === `Bearer ${secret}`) {
    req.cronAuthenticated = true;
    next();
    return;
  }

  requireAuth(req, res, () => {
    requireRole("admin", "treasurer")(req, res, () => {
      requireSociety(req, res, next);
    });
  });
}, remindersJobHandler);

export default router;
