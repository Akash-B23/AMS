import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import {
  createComplaint,
  findComplaintById,
  listComplaintsForResident,
  listComplaintsForSociety,
  updateComplaintStatus,
} from "../db/queries/complaints.js";
import { findResidentWithFlat } from "../db/queries/residents.js";
import { findUserById } from "../db/queries/users.js";

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

const STATUSES = ["open", "in_progress", "resolved", "closed", "rejected"];

const createSchema = z.object({
  category: z.enum(CATEGORIES).default("other"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
});

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
});

const updateSchema = z.object({
  status: z.enum(STATUSES),
  staffNotes: z.string().max(2000).optional().nullable(),
});

const ALLOWED_TRANSITIONS = {
  open: ["in_progress", "resolved", "rejected", "closed"],
  in_progress: ["resolved", "rejected", "closed", "open"],
  resolved: ["closed", "in_progress"],
  closed: [],
  rejected: ["open", "in_progress"],
};

function isTerminalStatus(status) {
  return status === "resolved" || status === "closed" || status === "rejected";
}

export async function createResidentComplaint(userId, societyId, body) {
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const resident = await findResidentWithFlat(tx, user.residentId);
    if (!resident || resident.societyId !== societyId) {
      return { error: "no_resident_profile" };
    }

    const complaint = await createComplaint(tx, {
      societyId,
      flatId: resident.flatId,
      raisedByResidentId: resident.id,
      raisedByUserId: userId,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId: userId,
      action: "complaint.create",
      entityType: "complaint",
      entityId: complaint.id,
      meta: {
        category: complaint.category,
        status: complaint.status,
      },
    });

    return { complaint };
  });
}

export async function getResidentComplaints(userId, societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const complaints = await listComplaintsForResident(
      tx,
      societyId,
      user.residentId,
    );
    return { complaints };
  });
}

export async function getResidentComplaintById(userId, societyId, complaintId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const complaint = await findComplaintById(tx, complaintId);
    if (!complaint || complaint.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (complaint.raisedByResidentId !== user.residentId) {
      return { error: "forbidden" };
    }

    return { complaint };
  });
}

export async function getSocietyComplaints(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const complaints = await listComplaintsForSociety(tx, societyId, parsed.data);
    return { complaints };
  });
}

export async function updateSocietyComplaint(
  societyId,
  actorUserId,
  complaintId,
  body,
) {
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const complaint = await findComplaintById(tx, complaintId);
    if (!complaint || complaint.societyId !== societyId) {
      return { error: "not_found" };
    }

    const allowed = ALLOWED_TRANSITIONS[complaint.status] ?? [];
    if (
      parsed.data.status !== complaint.status &&
      !allowed.includes(parsed.data.status)
    ) {
      return { error: "invalid_transition" };
    }

    let resolvedAt = null;
    if (
      isTerminalStatus(parsed.data.status) &&
      !complaint.resolvedAt
    ) {
      resolvedAt = new Date();
    }

    const staffNotes =
      parsed.data.staffNotes === undefined
        ? undefined
        : parsed.data.staffNotes;

    const updated = await updateComplaintStatus(tx, complaintId, {
      status: parsed.data.status,
      staffNotes,
      resolvedAt,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "complaint.status_update",
      entityType: "complaint",
      entityId: complaintId,
      meta: {
        from: complaint.status,
        to: parsed.data.status,
      },
    });

    return { complaint: updated };
  });
}
