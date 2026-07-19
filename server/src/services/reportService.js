import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { listUpcomingPlannedActivities } from "../db/queries/maintenanceActivities.js";
import {
  getCollectionReport,
  getComplaintsReport,
  getExpenseReport,
  getIncomeExpenseReport,
  getMaintenanceReport,
  getPendingDuesReport,
  getResidentComplaintCounts,
  getResidentInvoiceSummary,
  listResidentInvoicesForReport,
} from "../db/queries/reports.js";
import { findUserById } from "../db/queries/users.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const billingPeriodRegex = /^\d{4}-\d{2}$/;

const dateRangeSchema = z.object({
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
});

const pendingDuesQuerySchema = z.object({
  billingPeriod: z.string().regex(billingPeriodRegex).optional(),
});

function defaultYearRange() {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

function defaultMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function currentBillingPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function billingPeriodToDate(period) {
  return `${period}-01`;
}

function resolveDateRange(query) {
  const parsed = dateRangeSchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }
  const defaults = defaultYearRange();
  const from = parsed.data.from ?? defaults.from;
  const to = parsed.data.to ?? defaults.to;
  if (from > to) {
    return {
      error: "validation",
      issues: [{ message: "from must be on or before to" }],
    };
  }
  return { from, to };
}

function yearStartIso() {
  return `${new Date().getFullYear()}-01-01T00:00:00.000Z`;
}

function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getResidentReportSummary(societyId, userId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user?.residentId) {
      return { error: "not_found", message: "Resident profile not found" };
    }

    const invoiceSummary = await getResidentInvoiceSummary(tx, {
      societyId,
      residentId: user.residentId,
      yearStart: yearStartIso(),
    });
    const complaintsByStatus = await getResidentComplaintCounts(tx, {
      societyId,
      residentId: user.residentId,
    });
    const today = todayIsoDate();
    const upcomingMaintenance = await listUpcomingPlannedActivities(tx, societyId, {
      fromDate: today,
      toDate: addDaysIso(today, 30),
    });

    return {
      invoiceSummary,
      complaintsByStatus,
      upcomingMaintenance,
    };
  });
}

export async function getResidentInvoiceReport(societyId, userId, query) {
  const range = resolveDateRange(query);
  if (range.error) return range;

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user?.residentId) {
      return { error: "not_found", message: "Resident profile not found" };
    }

    const invoices = await listResidentInvoicesForReport(tx, {
      societyId,
      residentId: user.residentId,
      fromDate: range.from,
      toDate: range.to,
    });

    return { from: range.from, to: range.to, invoices };
  });
}

export async function getStaffCollectionReport(societyId, query) {
  const range = resolveDateRange(query);
  if (range.error) return range;

  return withDbContext({ societyId }, async (tx) => {
    const report = await getCollectionReport(tx, {
      societyId,
      fromDate: range.from,
      toDate: range.to,
    });
    return { from: range.from, to: range.to, ...report };
  });
}

export async function getStaffExpenseReport(societyId, query) {
  const range = resolveDateRange(query);
  if (range.error) return range;

  return withDbContext({ societyId }, async (tx) => {
    const report = await getExpenseReport(tx, {
      societyId,
      fromDate: range.from,
      toDate: range.to,
    });
    return { from: range.from, to: range.to, ...report };
  });
}

export async function getStaffComplaintsReport(societyId, query) {
  const range = resolveDateRange(query);
  if (range.error) return range;

  return withDbContext({ societyId }, async (tx) => {
    const report = await getComplaintsReport(tx, {
      societyId,
      fromDate: range.from,
      toDate: range.to,
    });
    return { from: range.from, to: range.to, ...report };
  });
}

export async function getStaffMaintenanceReport(societyId) {
  return withDbContext({ societyId }, async (tx) => {
    return getMaintenanceReport(tx, societyId);
  });
}

export async function getStaffPendingDuesReport(societyId, query) {
  const parsed = pendingDuesQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const billingPeriodYm =
    parsed.data.billingPeriod ?? currentBillingPeriod();
  const billingPeriod = billingPeriodToDate(billingPeriodYm);

  return withDbContext({ societyId }, async (tx) => {
    const report = await getPendingDuesReport(tx, {
      societyId,
      billingPeriod,
    });
    return {
      billingPeriod: billingPeriodYm,
      ...report,
    };
  });
}

export async function getStaffIncomeExpenseReport(societyId, query) {
  const parsed = dateRangeSchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const defaults = defaultMonthRange();
  const from = parsed.data.from ?? defaults.from;
  const to = parsed.data.to ?? defaults.to;
  if (from > to) {
    return {
      error: "validation",
      issues: [{ message: "from must be on or before to" }],
    };
  }

  return withDbContext({ societyId }, async (tx) => {
    const report = await getIncomeExpenseReport(tx, {
      societyId,
      fromDate: from,
      toDate: to,
    });
    return { from, to, ...report };
  });
}
