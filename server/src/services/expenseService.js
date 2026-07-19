import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import { createExpense, listExpenses } from "../db/queries/expenses.js";
import { findQuotationById } from "../db/queries/quotations.js";
import { findVendorById } from "../db/queries/vendors.js";

const CATEGORIES = [
  "utilities",
  "repairs",
  "security",
  "housekeeping",
  "landscaping",
  "salaries",
  "supplies",
  "other",
];

const createSchema = z.object({
  category: z.enum(CATEGORIES).default("other"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  amountPaise: z.number().int().positive(),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  vendorId: z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
});

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
});

export async function getExpenses(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const expenses = await listExpenses(tx, societyId, parsed.data);
    return { expenses };
  });
}

export async function createSocietyExpense(societyId, actorUserId, body) {
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    let vendorId = parsed.data.vendorId ?? null;
    let quotationId = parsed.data.quotationId ?? null;

    if (vendorId) {
      const vendor = await findVendorById(tx, vendorId);
      if (!vendor || vendor.societyId !== societyId) {
        return { error: "not_found", message: "Vendor not found" };
      }
    }

    if (quotationId) {
      const quotation = await findQuotationById(tx, quotationId);
      if (!quotation || quotation.societyId !== societyId) {
        return { error: "not_found", message: "Quotation not found" };
      }
      if (vendorId && quotation.vendorId !== vendorId) {
        return {
          error: "validation",
          issues: [{ message: "Quotation does not belong to the selected vendor" }],
        };
      }
      if (!vendorId) {
        vendorId = quotation.vendorId;
      }
    }

    const expenseDate =
      parsed.data.expenseDate ?? new Date().toISOString().slice(0, 10);

    const expense = await createExpense(tx, {
      societyId,
      vendorId,
      quotationId,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amountPaise: parsed.data.amountPaise,
      expenseDate,
      recordedByUserId: actorUserId,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "expense.create",
      entityType: "expense",
      entityId: expense.id,
      meta: {
        category: expense.category,
        amountPaise: expense.amountPaise,
        vendorId: expense.vendorId,
        quotationId: expense.quotationId,
      },
    });

    return { expense };
  });
}
