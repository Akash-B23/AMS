import { z } from "zod";
import { withDbContext } from "../db/context.js";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db/queries/notifications.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function getMyNotifications(societyId, userId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(tx, {
        societyId,
        userId,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      }),
      countUnreadNotifications(tx, { societyId, userId }),
    ]);
    return { notifications, unreadCount };
  });
}

export async function markMyNotificationRead(societyId, userId, notificationId) {
  return withDbContext({ societyId }, async (tx) => {
    const notification = await markNotificationRead(tx, {
      notificationId,
      userId,
      societyId,
    });
    if (!notification) {
      return { error: "not_found" };
    }
    return { notification };
  });
}

export async function markAllMyNotificationsRead(societyId, userId) {
  return withDbContext({ societyId }, async (tx) => {
    const updated = await markAllNotificationsRead(tx, { societyId, userId });
    return { updated };
  });
}
