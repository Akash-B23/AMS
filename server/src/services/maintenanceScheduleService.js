import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import {
  createMaintenanceActivity,
  findActivityByScheduleAndDate,
} from "../db/queries/maintenanceActivities.js";
import {
  createMaintenanceSchedule,
  findMaintenanceScheduleById,
  listAllDueMaintenanceSchedules,
  listMaintenanceSchedules,
  updateMaintenanceSchedule,
} from "../db/queries/maintenanceSchedules.js";
import { createNotification } from "../db/queries/notifications.js";
import { findSocietyById } from "../db/queries/societies.js";
import { listActiveUsersByRoles } from "../db/queries/users.js";
import { findVendorById } from "../db/queries/vendors.js";
import {
  buildMaintenanceDueEmail,
  sendEmail,
} from "./mailerService.js";

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

const FREQUENCIES = ["weekly", "monthly", "quarterly"];

const STAFF_NOTIFY_ROLES = ["manager", "admin", "treasurer", "association_staff"];

const createSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    category: z.enum(CATEGORIES).default("other"),
    vendorId: z.string().uuid().optional().nullable(),
    frequency: z.enum(FREQUENCIES),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
    notifyDaysBefore: z.number().int().min(0).max(30).optional().default(3),
    nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "weekly" && data.dayOfWeek == null) {
      ctx.addIssue({
        code: "custom",
        message: "dayOfWeek is required for weekly schedules",
        path: ["dayOfWeek"],
      });
    }
    if (data.frequency !== "weekly" && data.dayOfMonth == null) {
      ctx.addIssue({
        code: "custom",
        message: "dayOfMonth is required for monthly/quarterly schedules",
        path: ["dayOfMonth"],
      });
    }
  });

const listQuerySchema = z.object({
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === true || v === "true";
    }),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    category: z.enum(CATEGORIES).optional(),
    vendorId: z.string().uuid().optional().nullable(),
    frequency: z.enum(FREQUENCIES).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
    notifyDaysBefore: z.number().int().min(0).max(30).optional(),
    isActive: z.boolean().optional(),
    nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

function toIsoDate(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(isoDate, days) {
  const d = new Date(`${toIsoDate(isoDate)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function advanceDueDate(isoDate, frequency) {
  const d = new Date(`${toIsoDate(isoDate)}T00:00:00.000Z`);
  if (frequency === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 3);
  }
  return d.toISOString().slice(0, 10);
}

export async function getMaintenanceSchedules(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const schedules = await listMaintenanceSchedules(tx, societyId, parsed.data);
    return { schedules };
  });
}

export async function createSocietyMaintenanceSchedule(
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

    const schedule = await createMaintenanceSchedule(tx, {
      societyId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      vendorId: parsed.data.vendorId,
      frequency: parsed.data.frequency,
      dayOfWeek: parsed.data.frequency === "weekly" ? parsed.data.dayOfWeek : null,
      dayOfMonth:
        parsed.data.frequency === "weekly" ? null : parsed.data.dayOfMonth,
      notifyDaysBefore: parsed.data.notifyDaysBefore,
      nextDueDate: parsed.data.nextDueDate,
      createdByUserId: actorUserId,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "maintenance_schedule.create",
      entityType: "maintenance_schedule",
      entityId: schedule.id,
      meta: { title: schedule.title, frequency: schedule.frequency },
    });

    return { schedule };
  });
}

export async function updateSocietyMaintenanceSchedule(
  societyId,
  actorUserId,
  scheduleId,
  body,
) {
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const existing = await findMaintenanceScheduleById(tx, scheduleId);
    if (!existing || existing.societyId !== societyId) {
      return { error: "not_found" };
    }

    if (parsed.data.vendorId) {
      const vendor = await findVendorById(tx, parsed.data.vendorId);
      if (!vendor || vendor.societyId !== societyId) {
        return { error: "not_found", message: "Vendor not found" };
      }
    }

    const frequency = parsed.data.frequency ?? existing.frequency;
    const dayOfWeek =
      parsed.data.dayOfWeek !== undefined
        ? parsed.data.dayOfWeek
        : existing.dayOfWeek;
    const dayOfMonth =
      parsed.data.dayOfMonth !== undefined
        ? parsed.data.dayOfMonth
        : existing.dayOfMonth;

    if (frequency === "weekly" && dayOfWeek == null) {
      return {
        error: "validation",
        issues: [{ message: "dayOfWeek is required for weekly schedules" }],
      };
    }
    if (frequency !== "weekly" && dayOfMonth == null) {
      return {
        error: "validation",
        issues: [
          { message: "dayOfMonth is required for monthly/quarterly schedules" },
        ],
      };
    }

    const schedule = await updateMaintenanceSchedule(tx, scheduleId, {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      vendorId: parsed.data.vendorId,
      frequency: parsed.data.frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonth,
      notifyDaysBefore: parsed.data.notifyDaysBefore,
      isActive: parsed.data.isActive,
      nextDueDate: parsed.data.nextDueDate,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "maintenance_schedule.update",
      entityType: "maintenance_schedule",
      entityId: schedule.id,
      meta: parsed.data,
    });

    return { schedule };
  });
}

async function notifyStaffForSchedule(tx, { society, schedule, activity }) {
  const staff = await listActiveUsersByRoles(
    tx,
    society.id,
    STAFF_NOTIFY_ROLES,
  );
  const emailContent = buildMaintenanceDueEmail({
    societyName: society.name,
    title: schedule.title,
    activityDate: activity.activityDate,
    category: schedule.category,
  });

  for (const user of staff) {
    await createNotification(tx, {
      societyId: society.id,
      userId: user.id,
      type: "maintenance_generated",
      title: emailContent.subject,
      body: emailContent.text,
      meta: {
        scheduleId: schedule.id,
        activityId: activity.id,
        activityDate: activity.activityDate,
      },
    });

    if (user.email) {
      await sendEmail(tx, {
        societyId: society.id,
        userId: user.id,
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        template: "maintenance_due",
        payload: {
          scheduleId: schedule.id,
          activityId: activity.id,
        },
      });
    }
  }

  return staff.length;
}

export async function generateDueMaintenanceSchedules() {
  const today = todayIsoDate();

  const dueSchedules = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => listAllDueMaintenanceSchedules(tx, today),
  );

  let generated = 0;
  let skippedExisting = 0;
  let notified = 0;
  const bySociety = {};

  for (const schedule of dueSchedules) {
    const result = await withDbContext(
      { societyId: schedule.societyId },
      async (tx) => {
        const society = await findSocietyById(tx, schedule.societyId);
        const existing = await findActivityByScheduleAndDate(tx, {
          societyId: schedule.societyId,
          scheduleId: schedule.id,
          activityDate: schedule.nextDueDate,
        });

        let activity = existing;
        let created = false;
        if (!existing) {
          activity = await createMaintenanceActivity(tx, {
            societyId: schedule.societyId,
            vendorId: schedule.vendorId,
            scheduleId: schedule.id,
            category: schedule.category,
            title: schedule.title,
            description: schedule.description,
            status: "planned",
            activityDate: schedule.nextDueDate,
            loggedByUserId: schedule.createdByUserId,
          });
          created = true;
        }

        const nextDue = advanceDueDate(schedule.nextDueDate, schedule.frequency);
        await updateMaintenanceSchedule(tx, schedule.id, {
          nextDueDate: nextDue,
          lastGeneratedAt: new Date().toISOString(),
        });

        const staffNotified = await notifyStaffForSchedule(tx, {
          society,
          schedule,
          activity,
        });

        return { created, staffNotified };
      },
    );

    if (result.created) {
      generated += 1;
    } else {
      skippedExisting += 1;
    }
    notified += result.staffNotified;
    bySociety[schedule.societyId] = (bySociety[schedule.societyId] ?? 0) + 1;
  }

  return {
    asOf: today,
    processed: dueSchedules.length,
    generated,
    skippedExisting,
    notified,
    societies: Object.keys(bySociety).length,
  };
}

export { advanceDueDate, addDaysIso, todayIsoDate };
