import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../services/notificationService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listNotificationsHandler(req, res) {
  const result = await getMyNotifications(
    req.user.societyId,
    req.user.id,
    req.query,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function markNotificationReadHandler(req, res) {
  const result = await markMyNotificationRead(
    req.user.societyId,
    req.user.id,
    req.params.id,
  );
  if (result.error === "not_found") {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(result);
}

export async function markAllNotificationsReadHandler(req, res) {
  const result = await markAllMyNotificationsRead(
    req.user.societyId,
    req.user.id,
  );
  res.json(result);
}
