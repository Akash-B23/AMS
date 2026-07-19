import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import {
  createVendor,
  findVendorById,
  listVendors,
  updateVendor,
} from "../db/queries/vendors.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(200),
  contactName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().trim().max(5000).optional().nullable(),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  contactName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

const listQuerySchema = z.object({
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

function normalizeEmail(email) {
  if (email === "" || email === undefined) return null;
  return email;
}

export async function getVendors(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const vendors = await listVendors(tx, societyId, {
      activeOnly: parsed.data.activeOnly || undefined,
    });
    return { vendors };
  });
}

export async function createSocietyVendor(societyId, actorUserId, body) {
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const vendor = await createVendor(tx, {
      societyId,
      name: parsed.data.name,
      contactName: parsed.data.contactName ?? null,
      phone: parsed.data.phone ?? null,
      email: normalizeEmail(parsed.data.email),
      notes: parsed.data.notes ?? null,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "vendor.create",
      entityType: "vendor",
      entityId: vendor.id,
      meta: { name: vendor.name },
    });

    return { vendor };
  });
}

export async function updateSocietyVendor(
  societyId,
  actorUserId,
  vendorId,
  body,
) {
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const existing = await findVendorById(tx, vendorId);
    if (!existing || existing.societyId !== societyId) {
      return { error: "not_found" };
    }

    const vendor = await updateVendor(tx, vendorId, {
      name: parsed.data.name,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone,
      email:
        parsed.data.email !== undefined
          ? normalizeEmail(parsed.data.email)
          : undefined,
      notes: parsed.data.notes,
      isActive: parsed.data.isActive,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "vendor.update",
      entityType: "vendor",
      entityId: vendorId,
      meta: {
        isActive: vendor.isActive,
      },
    });

    return { vendor };
  });
}
