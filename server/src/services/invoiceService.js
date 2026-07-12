import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import { listFlatsWithBlocks } from "../db/queries/flats.js";
import {
  createInvoice,
  findInvoiceById,
  listInvoices,
  listInvoicesForResident,
  listPendingDues,
  listPendingInvoicesForReminders,
  markInvoicePaid,
} from "../db/queries/invoices.js";
import { createPayment } from "../db/queries/payments.js";
import { findBillingResidentForFlat } from "../db/queries/residents.js";
import {
  findSocietyById,
  listActiveSocieties,
  updateCashfreeVendorId,
} from "../db/queries/societies.js";
import { findUserById } from "../db/queries/users.js";
import {
  createReminderLog,
  countRemindersForInvoiceToday,
} from "../db/queries/reminderLogs.js";

const generateSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

const duesQuerySchema = z.object({
  blockId: z.string().uuid().optional(),
  overdueOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
});

const listQuerySchema = z.object({
  status: z.enum(["pending", "paid", "cancelled"]).optional(),
  billingPeriod: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  blockId: z.string().uuid().optional(),
});

const markPaidSchema = z.object({
  method: z.enum(["cash", "cheque", "upi_offline", "other"]),
  notes: z.string().max(500).optional().nullable(),
});

const paymentsSettingsSchema = z.object({
  cashfreeVendorId: z.string().min(1).max(64).nullable().optional(),
});

function billingPeriodDate(year, month) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function dueDateForPeriod(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatRupees(paise) {
  return (paise / 100).toFixed(2);
}

export async function generateInvoicesForSociety(
  societyId,
  { year, month } = {},
  actorUserId = null,
) {
  const ym = currentYearMonth();
  const targetYear = year ?? ym.year;
  const targetMonth = month ?? ym.month;
  const billingPeriod = billingPeriodDate(targetYear, targetMonth);
  const dueDate = dueDateForPeriod(targetYear, targetMonth);

  return withDbContext({ societyId }, async (tx) => {
    const flats = await listFlatsWithBlocks(tx, societyId);
    let created = 0;
    let skippedExisting = 0;
    let skippedNoAmount = 0;
    let skippedNoResident = 0;

    for (const flat of flats) {
      if (
        flat.maintenanceAmountPaise == null ||
        flat.maintenanceAmountPaise <= 0
      ) {
        skippedNoAmount += 1;
        continue;
      }

      const resident = await findBillingResidentForFlat(
        tx,
        societyId,
        flat.id,
      );
      if (!resident) {
        skippedNoResident += 1;
        continue;
      }

      const invoice = await createInvoice(tx, {
        societyId,
        flatId: flat.id,
        billedResidentId: resident.id,
        billingPeriod,
        amountPaise: flat.maintenanceAmountPaise,
        dueDate,
      });

      if (invoice) {
        created += 1;
      } else {
        skippedExisting += 1;
      }
    }

    if (actorUserId) {
      await createAuditLog(tx, {
        societyId,
        actorUserId,
        action: "invoices.generate",
        entityType: "invoices",
        meta: {
          billingPeriod,
          created,
          skippedExisting,
          skippedNoAmount,
          skippedNoResident,
        },
      });
    }

    return {
      billingPeriod,
      dueDate,
      created,
      skippedExisting,
      skippedNoAmount,
      skippedNoResident,
    };
  });
}

export async function generateInvoices(societyId, actorUserId, body) {
  const parsed = generateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const summary = await generateInvoicesForSociety(
    societyId,
    parsed.data,
    actorUserId,
  );
  return { summary };
}

export async function generateInvoicesForAllSocieties() {
  const societies = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => listActiveSocieties(tx),
  );

  const ym = currentYearMonth();
  const results = [];

  for (const society of societies) {
    const summary = await generateInvoicesForSociety(society.id, ym, null);
    results.push({
      societyId: society.id,
      societySlug: society.slug,
      ...summary,
    });
  }

  return { year: ym.year, month: ym.month, societies: results };
}

export async function getPendingDues(societyId, query) {
  const parsed = duesQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const invoices = await listPendingDues(tx, societyId, parsed.data);
    const totalAmountPaise = invoices.reduce(
      (sum, inv) => sum + inv.amountPaise,
      0,
    );
    return {
      invoices,
      totals: {
        count: invoices.length,
        amountPaise: totalAmountPaise,
      },
    };
  });
}

export async function getInvoiceList(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const invoices = await listInvoices(tx, societyId, parsed.data);
    return { invoices };
  });
}

export async function markInvoicePaidOffline(
  societyId,
  actorUserId,
  invoiceId,
  body,
) {
  const parsed = markPaidSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const invoice = await findInvoiceById(tx, invoiceId);
    if (!invoice || invoice.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (invoice.status !== "pending") {
      return { error: "not_pending" };
    }

    const paid = await markInvoicePaid(tx, invoiceId);
    if (!paid) {
      return { error: "not_pending" };
    }

    const payment = await createPayment(tx, {
      societyId,
      invoiceId,
      amountPaise: invoice.amountPaise,
      method: parsed.data.method,
      status: "captured",
      recordedByUserId: actorUserId,
      notes: parsed.data.notes ?? null,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "invoice.mark_paid",
      entityType: "invoice",
      entityId: invoiceId,
      meta: {
        method: parsed.data.method,
        amountPaise: invoice.amountPaise,
        paymentId: payment.id,
      },
    });

    const updated = await findInvoiceById(tx, invoiceId);
    return { invoice: updated, payment };
  });
}

export async function getResidentDues(userId, societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const invoices = await listInvoicesForResident(
      tx,
      societyId,
      user.residentId,
    );
    const unpaid = invoices.filter((inv) => inv.status === "pending");
    const paid = invoices.filter((inv) => inv.status === "paid");
    const amountDuePaise = unpaid.reduce(
      (sum, inv) => sum + inv.amountPaise,
      0,
    );

    return {
      amountDuePaise,
      unpaidInvoices: unpaid,
      paidInvoices: paid,
    };
  });
}

export async function updateSocietyPaymentsSettings(
  societyId,
  actorUserId,
  body,
) {
  const parsed = paymentsSettingsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const vendorId =
      parsed.data.cashfreeVendorId === undefined
        ? undefined
        : parsed.data.cashfreeVendorId;

    if (vendorId === undefined) {
      const society = await findSocietyById(tx, societyId);
      return {
        society: {
          id: society.id,
          name: society.name,
          cashfreeVendorId: society.cashfreeVendorId,
        },
      };
    }

    const society = await updateCashfreeVendorId(tx, societyId, vendorId);

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "society.payments_settings",
      entityType: "society",
      entityId: societyId,
      meta: { cashfreeVendorId: vendorId },
    });

    return {
      society: {
        id: society.id,
        name: society.name,
        cashfreeVendorId: society.cashfreeVendorId,
      },
    };
  });
}

export async function getSocietyPaymentsSettings(societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const society = await findSocietyById(tx, societyId);
    if (!society) {
      return { error: "not_found" };
    }
    return {
      society: {
        id: society.id,
        name: society.name,
        cashfreeVendorId: society.cashfreeVendorId,
      },
    };
  });
}

export async function runRemindersForSociety(societyId, actorUserId = null) {
  return withDbContext({ societyId }, async (tx) => {
    const society = await findSocietyById(tx, societyId);
    const invoices = await listPendingInvoicesForReminders(tx, societyId);
    let recorded = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      const alreadyToday = await countRemindersForInvoiceToday(tx, invoice.id);
      if (alreadyToday > 0) {
        skipped += 1;
        continue;
      }

      const to = invoice.residentEmail;
      const amount = formatRupees(invoice.amountPaise);
      const subject = `Maintenance reminder — ${society?.name ?? "Society"}`;
      const body = to
        ? `Dear ${invoice.residentName}, your maintenance of ₹${amount} for ${invoice.billingPeriod} (flat ${invoice.blockName}-${invoice.flatNumber}) is due on ${invoice.dueDate}.`
        : null;

      if (!to) {
        await createReminderLog(tx, {
          societyId,
          invoiceId: invoice.id,
          residentId: invoice.billedResidentId,
          status: "skipped",
          payload: {
            reason: "no_email",
            subject,
            amountPaise: invoice.amountPaise,
          },
        });
        skipped += 1;
        continue;
      }

      await createReminderLog(tx, {
        societyId,
        invoiceId: invoice.id,
        residentId: invoice.billedResidentId,
        status: "recorded",
        payload: {
          to,
          subject,
          body,
          amountPaise: invoice.amountPaise,
          dueDate: invoice.dueDate,
          billingPeriod: invoice.billingPeriod,
        },
      });
      recorded += 1;
    }

    if (actorUserId) {
      await createAuditLog(tx, {
        societyId,
        actorUserId,
        action: "reminders.run",
        entityType: "reminder_logs",
        meta: { recorded, skipped },
      });
    }

    return { recorded, skipped, pendingCount: invoices.length };
  });
}

export async function runRemindersForAllSocieties() {
  const societies = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => listActiveSocieties(tx),
  );

  const results = [];
  for (const society of societies) {
    const summary = await runRemindersForSociety(society.id, null);
    results.push({
      societyId: society.id,
      societySlug: society.slug,
      ...summary,
    });
  }
  return { societies: results };
}
