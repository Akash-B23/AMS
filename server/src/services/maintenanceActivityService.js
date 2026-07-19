import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import {
  createMaintenanceActivity,
  findMaintenanceActivityById,
  listMaintenanceActivities,
  updateMaintenanceActivity,
} from "../db/queries/maintenanceActivities.js";
import { findVendorById } from "../db/queries/vendors.js";

const CATEGORIES = [
  "plumbing",
  "electrical",
  "civil",
  "security",
  "housekeeping",
  "lift",
  "parking",
  "noise",
  "other",
];

const STATUSES = ["planned", "in_progress", "completed", "cancelled"];

const ALLOWED_TRANSITIONS = {
  planned: ["in_progress", "completed", "cancelled"],
  in_progress: ["planned", "completed", "cancelled"],
  completed: ["in_progress", "cancelled"],
  cancelled: [],
};

const createSchema = z.object({
  category: z.enum(CATEGORIES).default("other"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(STATUSES).default("planned"),
  activityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  vendorId: z.string().uuid().optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
});

export async function getMaintenanceActivities(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const activities = await listMaintenanceActivities(
      tx,
      societyId,
      parsed.data,
    );
    return { activities };
  });
}

export async function createSocietyMaintenanceActivity(
  societyId,
  actorUserId,
  body,
) {
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    if (parsed.data.vendorId) {
      const vendor = await findVendorById(tx, parsed.data.vendorId);
      if (!vendor || vendor.societyId !== societyId) {
        return { error: "not_found", message: "Vendor not found" };
      }
    }

    const activityDate =
      parsed.data.activityDate ?? new Date().toISOString().slice(0, 10);

    const activity = await createMaintenanceActivity(tx, {
      societyId,
      vendorId: parsed.data.vendorId ?? null,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      activityDate,
      loggedByUserId: actorUserId,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "maintenance_activity.create",
      entityType: "maintenance_activity",
      entityId: activity.id,
      meta: {
        category: activity.category,
        status: activity.status,
      },
    });

    return { activity };
  });
}

export async function updateSocietyMaintenanceActivity(
  societyId,
  actorUserId,
  activityId,
  body,
) {
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  if (
    parsed.data.status === undefined &&
    parsed.data.title === undefined &&
    parsed.data.description === undefined
  ) {
    return {
      error: "validation",
      issues: [{ message: "At least one field is required" }],
    };
  }

  return withDbContext({ societyId }, async (tx) => {
    const existing = await findMaintenanceActivityById(tx, activityId);
    if (!existing || existing.societyId !== societyId) {
      return { error: "not_found" };
    }

    if (
      parsed.data.status !== undefined &&
      parsed.data.status !== existing.status
    ) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return { error: "invalid_transition" };
      }
    }

    const activity = await updateMaintenanceActivity(tx, activityId, {
      status: parsed.data.status,
      title: parsed.data.title,
      description: parsed.data.description,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "maintenance_activity.status_update",
      entityType: "maintenance_activity",
      entityId: activityId,
      meta: {
        from: existing.status,
        to: activity.status,
      },
    });

    return { activity };
  });
}
