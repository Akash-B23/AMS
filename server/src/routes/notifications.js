import { Router } from "express";
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from "../controllers/notificationController.js";
import { requireAuth, requireSociety } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireSociety);

router.get("/", listNotificationsHandler);
router.patch("/:id/read", markNotificationReadHandler);
router.post("/read-all", markAllNotificationsReadHandler);

export default router;
