import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import {
  createQuotation,
  findQuotationById,
  listQuotations,
  updateQuotationReview,
} from "../db/queries/quotations.js";
import { findVendorById } from "../db/queries/vendors.js";

const STATUSES = ["pending", "approved", "rejected"];

const createSchema = z.object({
  vendorId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  amountPaise: z.number().int().positive(),
});

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(2000),
});

export async function getQuotations(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const quotations = await listQuotations(tx, societyId, parsed.data);
    return { quotations };
  });
}

export async function createSocietyQuotation(societyId, actorUserId, body) {
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const vendor = await findVendorById(tx, parsed.data.vendorId);
    if (!vendor || vendor.societyId !== societyId) {
      return { error: "not_found", message: "Vendor not found" };
    }
    if (!vendor.isActive) {
      return { error: "validation", issues: [{ message: "Vendor is inactive" }] };
    }

    const quotation = await createQuotation(tx, {
      societyId,
      vendorId: parsed.data.vendorId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amountPaise: parsed.data.amountPaise,
      submittedByUserId: actorUserId,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "quotation.create",
      entityType: "quotation",
      entityId: quotation.id,
      meta: {
        vendorId: quotation.vendorId,
        amountPaise: quotation.amountPaise,
      },
    });

    return { quotation };
  });
}

export async function approveQuotation(societyId, actorUserId, quotationId) {
  return withDbContext({ societyId }, async (tx) => {
    const quotation = await findQuotationById(tx, quotationId);
    if (!quotation || quotation.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (quotation.status !== "pending") {
      return { error: "invalid_transition" };
    }

    const updated = await updateQuotationReview(tx, quotationId, {
      status: "approved",
      reviewedByUserId: actorUserId,
      rejectionReason: null,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "quotation.approve",
      entityType: "quotation",
      entityId: quotationId,
      meta: { from: "pending", to: "approved" },
    });

    return { quotation: updated };
  });
}

export async function rejectQuotation(
  societyId,
  actorUserId,
  quotationId,
  body,
) {
  const parsed = rejectSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const quotation = await findQuotationById(tx, quotationId);
    if (!quotation || quotation.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (quotation.status !== "pending") {
      return { error: "invalid_transition" };
    }

    const updated = await updateQuotationReview(tx, quotationId, {
      status: "rejected",
      reviewedByUserId: actorUserId,
      rejectionReason: parsed.data.rejectionReason,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "quotation.reject",
      entityType: "quotation",
      entityId: quotationId,
      meta: {
        from: "pending",
        to: "rejected",
        rejectionReason: parsed.data.rejectionReason,
      },
    });

    return { quotation: updated };
  });
}
