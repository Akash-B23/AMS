export async function getResidentInvoiceSummary(client, { societyId, residentId, yearStart }) {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= $3::timestamptz THEN amount_paise ELSE 0 END), 0)::bigint AS paid_ytd_paise,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_paise ELSE 0 END), 0)::bigint AS pending_amount_paise
     FROM invoices
     WHERE society_id = $1
       AND billed_resident_id = $2`,
    [societyId, residentId, yearStart],
  );
  const row = result.rows[0];
  return {
    paidYtdPaise: Number(row.paid_ytd_paise),
    pendingCount: row.pending_count,
    pendingAmountPaise: Number(row.pending_amount_paise),
  };
}

export async function listResidentInvoicesForReport(
  client,
  { societyId, residentId, fromDate, toDate },
) {
  const result = await client.query(
    `SELECT i.id, i.billing_period, i.due_date, i.amount_paise, i.status,
            i.issued_at, i.paid_at,
            p.method AS payment_method, p.transaction_ref, p.status AS payment_status
     FROM invoices i
     LEFT JOIN LATERAL (
       SELECT method, transaction_ref, status
       FROM payments
       WHERE invoice_id = i.id AND status = 'captured'
       ORDER BY created_at DESC
       LIMIT 1
     ) p ON true
     WHERE i.society_id = $1
       AND i.billed_resident_id = $2
       AND i.billing_period >= $3::date
       AND i.billing_period <= $4::date
     ORDER BY i.billing_period DESC`,
    [societyId, residentId, fromDate, toDate],
  );
  return result.rows.map((row) => ({
    id: row.id,
    billingPeriod: row.billing_period,
    dueDate: row.due_date,
    amountPaise: row.amount_paise,
    status: row.status,
    issuedAt: row.issued_at,
    paidAt: row.paid_at ?? null,
    paymentMethod: row.payment_method ?? null,
    transactionRef: row.transaction_ref ?? null,
    paymentStatus: row.payment_status ?? null,
  }));
}

export async function getResidentComplaintCounts(client, { societyId, residentId }) {
  const result = await client.query(
    `SELECT status, COUNT(*)::int AS count
     FROM complaints
     WHERE society_id = $1 AND raised_by_resident_id = $2
     GROUP BY status
     ORDER BY status`,
    [societyId, residentId],
  );
  return result.rows.map((row) => ({ status: row.status, count: row.count }));
}

export async function getCollectionReport(
  client,
  { societyId, fromDate, toDate },
) {
  const result = await client.query(
    `SELECT
       billing_period,
       status,
       COUNT(*)::int AS count,
       COALESCE(SUM(amount_paise), 0)::bigint AS amount_paise
     FROM invoices
     WHERE society_id = $1
       AND billing_period >= $2::date
       AND billing_period <= $3::date
     GROUP BY billing_period, status
     ORDER BY billing_period DESC, status`,
    [societyId, fromDate, toDate],
  );

  const totalsResult = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paise ELSE 0 END), 0)::bigint AS paid_amount_paise,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_paise ELSE 0 END), 0)::bigint AS pending_amount_paise,
       COUNT(*) FILTER (
         WHERE status = 'pending' AND due_date < CURRENT_DATE
       )::int AS overdue_count,
       COALESCE(SUM(
         CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount_paise ELSE 0 END
       ), 0)::bigint AS overdue_amount_paise
     FROM invoices
     WHERE society_id = $1
       AND billing_period >= $2::date
       AND billing_period <= $3::date`,
    [societyId, fromDate, toDate],
  );

  const totals = totalsResult.rows[0];
  return {
    rows: result.rows.map((row) => ({
      billingPeriod: row.billing_period,
      status: row.status,
      count: row.count,
      amountPaise: Number(row.amount_paise),
    })),
    totals: {
      paidCount: totals.paid_count,
      paidAmountPaise: Number(totals.paid_amount_paise),
      pendingCount: totals.pending_count,
      pendingAmountPaise: Number(totals.pending_amount_paise),
      overdueCount: totals.overdue_count,
      overdueAmountPaise: Number(totals.overdue_amount_paise),
    },
  };
}

export async function getExpenseReport(client, { societyId, fromDate, toDate }) {
  const result = await client.query(
    `SELECT category,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount_paise), 0)::bigint AS amount_paise
     FROM expenses
     WHERE society_id = $1
       AND expense_date >= $2::date
       AND expense_date <= $3::date
     GROUP BY category
     ORDER BY category`,
    [societyId, fromDate, toDate],
  );

  const totalsResult = await client.query(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(amount_paise), 0)::bigint AS amount_paise
     FROM expenses
     WHERE society_id = $1
       AND expense_date >= $2::date
       AND expense_date <= $3::date`,
    [societyId, fromDate, toDate],
  );

  const totals = totalsResult.rows[0];
  return {
    rows: result.rows.map((row) => ({
      category: row.category,
      count: row.count,
      amountPaise: Number(row.amount_paise),
    })),
    totals: {
      count: totals.count,
      amountPaise: Number(totals.amount_paise),
    },
  };
}

export async function getComplaintsReport(
  client,
  { societyId, fromDate, toDate },
) {
  const byStatus = await client.query(
    `SELECT status, COUNT(*)::int AS count
     FROM complaints
     WHERE society_id = $1
       AND created_at::date >= $2::date
       AND created_at::date <= $3::date
     GROUP BY status
     ORDER BY status`,
    [societyId, fromDate, toDate],
  );

  const byCategory = await client.query(
    `SELECT category, COUNT(*)::int AS count
     FROM complaints
     WHERE society_id = $1
       AND created_at::date >= $2::date
       AND created_at::date <= $3::date
     GROUP BY category
     ORDER BY category`,
    [societyId, fromDate, toDate],
  );

  return {
    byStatus: byStatus.rows.map((row) => ({
      status: row.status,
      count: row.count,
    })),
    byCategory: byCategory.rows.map((row) => ({
      category: row.category,
      count: row.count,
    })),
  };
}

export async function getMaintenanceReport(client, societyId) {
  const schedules = await client.query(
    `SELECT id, title, category, frequency, is_active,
            next_due_date::text AS next_due_date, last_generated_at
     FROM maintenance_schedules
     WHERE society_id = $1
     ORDER BY next_due_date ASC`,
    [societyId],
  );

  const activities = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'planned')::int AS planned_count,
       COUNT(*) FILTER (
         WHERE status = 'planned' AND activity_date < CURRENT_DATE
       )::int AS overdue_count,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
       COUNT(*) FILTER (WHERE schedule_id IS NOT NULL)::int AS from_schedule_count
     FROM maintenance_activities
     WHERE society_id = $1`,
    [societyId],
  );

  const counts = activities.rows[0];
  return {
    schedules: schedules.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      frequency: row.frequency,
      isActive: row.is_active,
      nextDueDate: row.next_due_date,
      lastGeneratedAt: row.last_generated_at ?? null,
    })),
    activityCounts: {
      planned: counts.planned_count,
      overdue: counts.overdue_count,
      completed: counts.completed_count,
      inProgress: counts.in_progress_count,
      cancelled: counts.cancelled_count,
      fromSchedule: counts.from_schedule_count,
    },
  };
}

function toDateOnly(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export async function getPendingDuesReport(client, { societyId, billingPeriod }) {
  const result = await client.query(
    `SELECT i.id, i.billing_period, i.due_date, i.amount_paise,
            f.flat_number, b.name AS block_name,
            r.name AS resident_name
     FROM invoices i
     JOIN flats f ON f.id = i.flat_id
     JOIN blocks b ON b.id = f.block_id
     JOIN residents r ON r.id = i.billed_resident_id
     WHERE i.society_id = $1
       AND i.status = 'pending'
       AND i.billing_period = $2::date
     ORDER BY b.name, f.flat_number`,
    [societyId, billingPeriod],
  );

  const today = new Date().toISOString().slice(0, 10);
  const rows = result.rows.map((row) => {
    const dueDate = toDateOnly(row.due_date);
    return {
      id: row.id,
      billingPeriod: toDateOnly(row.billing_period),
      dueDate,
      amountPaise: row.amount_paise,
      flatNumber: row.flat_number,
      blockName: row.block_name,
      residentName: row.resident_name,
      isOverdue: dueDate != null && dueDate < today,
    };
  });

  const overdueRows = rows.filter((r) => r.isOverdue);
  return {
    rows,
    totals: {
      pendingCount: rows.length,
      pendingAmountPaise: rows.reduce((sum, r) => sum + r.amountPaise, 0),
      overdueCount: overdueRows.length,
      overdueAmountPaise: overdueRows.reduce(
        (sum, r) => sum + r.amountPaise,
        0,
      ),
    },
  };
}

export async function getIncomeExpenseReport(
  client,
  { societyId, fromDate, toDate },
) {
  const incomeResult = await client.query(
    `SELECT COUNT(*)::int AS paid_count,
            COALESCE(SUM(amount_paise), 0)::bigint AS income_paise
     FROM invoices
     WHERE society_id = $1
       AND status = 'paid'
       AND paid_at IS NOT NULL
       AND paid_at::date >= $2::date
       AND paid_at::date <= $3::date`,
    [societyId, fromDate, toDate],
  );

  const expenseByCategory = await client.query(
    `SELECT category,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount_paise), 0)::bigint AS amount_paise
     FROM expenses
     WHERE society_id = $1
       AND expense_date >= $2::date
       AND expense_date <= $3::date
     GROUP BY category
     ORDER BY category`,
    [societyId, fromDate, toDate],
  );

  const expenseTotals = await client.query(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(amount_paise), 0)::bigint AS amount_paise
     FROM expenses
     WHERE society_id = $1
       AND expense_date >= $2::date
       AND expense_date <= $3::date`,
    [societyId, fromDate, toDate],
  );

  const incomePaise = Number(incomeResult.rows[0].income_paise);
  const expensePaise = Number(expenseTotals.rows[0].amount_paise);

  return {
    income: {
      paidCount: incomeResult.rows[0].paid_count,
      amountPaise: incomePaise,
    },
    expenses: {
      byCategory: expenseByCategory.rows.map((row) => ({
        category: row.category,
        count: row.count,
        amountPaise: Number(row.amount_paise),
      })),
      totals: {
        count: expenseTotals.rows[0].count,
        amountPaise: expensePaise,
      },
    },
    netPaise: incomePaise - expensePaise,
  };
}
