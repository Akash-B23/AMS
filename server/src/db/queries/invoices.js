function toDateOnly(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function mapInvoice(row) {
  const dueDate = toDateOnly(row.due_date);
  const today = new Date().toISOString().slice(0, 10);
  const transactionRef = row.transaction_ref ?? null;
  const paymentStatus = row.payment_status ?? null;
  const awaitingVerification =
    row.status === "pending" &&
    paymentStatus === "created" &&
    Boolean(transactionRef);
  const isOverdue =
    row.status === "pending" &&
    !awaitingVerification &&
    dueDate != null &&
    dueDate < today;

  let displayStatus = row.status;
  if (awaitingVerification) {
    displayStatus = "awaiting_verification";
  } else if (isOverdue) {
    displayStatus = "overdue";
  }

  return {
    id: row.id,
    societyId: row.society_id,
    flatId: row.flat_id,
    billedResidentId: row.billed_resident_id,
    billingPeriod: toDateOnly(row.billing_period),
    amountPaise: row.amount_paise,
    status: row.status,
    displayStatus,
    transactionRef,
    paymentStatus,
    pendingPaymentId: row.pending_payment_id ?? null,
    dueDate,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flatNumber: row.flat_number ?? null,
    blockName: row.block_name ?? null,
    blockId: row.block_id ?? null,
    residentName: row.resident_name ?? null,
    residentEmail: row.resident_email ?? null,
    residentPhone: row.resident_phone ?? null,
  };
}

const INVOICE_SELECT = `
  SELECT i.id, i.society_id, i.flat_id, i.billed_resident_id, i.billing_period,
         i.amount_paise, i.status, i.due_date, i.issued_at, i.paid_at,
         i.created_at, i.updated_at,
         f.flat_number, b.name AS block_name, b.id AS block_id,
         r.name AS resident_name, r.email AS resident_email, r.phone AS resident_phone,
         pp.transaction_ref, pp.status AS payment_status, pp.id AS pending_payment_id
  FROM invoices i
  JOIN flats f ON f.id = i.flat_id
  JOIN blocks b ON b.id = f.block_id
  JOIN residents r ON r.id = i.billed_resident_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.transaction_ref, p.status
    FROM payments p
    WHERE p.invoice_id = i.id AND p.status = 'created'
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pp ON true
`;

export async function findInvoiceById(client, invoiceId) {
  const result = await client.query(
    `${INVOICE_SELECT}
     WHERE i.id = $1
     LIMIT 1`,
    [invoiceId],
  );
  return result.rows[0] ? mapInvoice(result.rows[0]) : null;
}

export async function findInvoiceByPeriod(client, societyId, flatId, billingPeriod) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, billed_resident_id, billing_period,
            amount_paise, status, due_date, issued_at, paid_at, created_at, updated_at
     FROM invoices
     WHERE society_id = $1 AND flat_id = $2 AND billing_period = $3
     LIMIT 1`,
    [societyId, flatId, billingPeriod],
  );
  return result.rows[0] ? mapInvoice(result.rows[0]) : null;
}

export async function createInvoice(
  client,
  {
    societyId,
    flatId,
    billedResidentId,
    billingPeriod,
    amountPaise,
    dueDate,
  },
) {
  const result = await client.query(
    `INSERT INTO invoices (
       society_id, flat_id, billed_resident_id, billing_period,
       amount_paise, due_date
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (society_id, flat_id, billing_period) DO NOTHING
     RETURNING id, society_id, flat_id, billed_resident_id, billing_period,
               amount_paise, status, due_date, issued_at, paid_at,
               created_at, updated_at`,
    [societyId, flatId, billedResidentId, billingPeriod, amountPaise, dueDate],
  );
  return result.rows[0] ? mapInvoice(result.rows[0]) : null;
}

export async function listInvoices(
  client,
  societyId,
  { status, billingPeriod, blockId } = {},
) {
  const conditions = ["i.society_id = $1"];
  const params = [societyId];
  let idx = 2;

  if (status) {
    conditions.push(`i.status = $${idx}`);
    params.push(status);
    idx += 1;
  }
  if (billingPeriod) {
    conditions.push(`i.billing_period = $${idx}`);
    params.push(billingPeriod);
    idx += 1;
  }
  if (blockId) {
    conditions.push(`b.id = $${idx}`);
    params.push(blockId);
    idx += 1;
  }

  const result = await client.query(
    `${INVOICE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY i.billing_period DESC, b.name, f.flat_number`,
    params,
  );
  return result.rows.map(mapInvoice);
}

export async function listPendingDues(
  client,
  societyId,
  { blockId, overdueOnly = false } = {},
) {
  const conditions = ["i.society_id = $1", "i.status = 'pending'"];
  const params = [societyId];
  let idx = 2;

  if (blockId) {
    conditions.push(`b.id = $${idx}`);
    params.push(blockId);
    idx += 1;
  }
  if (overdueOnly) {
    conditions.push(`i.due_date < CURRENT_DATE`);
  }

  const result = await client.query(
    `${INVOICE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY i.due_date ASC, b.name, f.flat_number`,
    params,
  );
  return result.rows.map(mapInvoice);
}

export async function listInvoicesForResident(client, societyId, residentId) {
  const result = await client.query(
    `${INVOICE_SELECT}
     WHERE i.society_id = $1 AND i.billed_resident_id = $2
     ORDER BY i.billing_period DESC`,
    [societyId, residentId],
  );
  return result.rows.map(mapInvoice);
}

export async function markInvoicePaid(client, invoiceId, paidAt = new Date()) {
  const result = await client.query(
    `UPDATE invoices
     SET status = 'paid', paid_at = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, society_id, flat_id, billed_resident_id, billing_period,
               amount_paise, status, due_date, issued_at, paid_at,
               created_at, updated_at`,
    [invoiceId, paidAt],
  );
  return result.rows[0] ? mapInvoice(result.rows[0]) : null;
}

export async function listPendingInvoicesForReminders(client, societyId) {
  const result = await client.query(
    `${INVOICE_SELECT}
     WHERE i.society_id = $1 AND i.status = 'pending'
     ORDER BY i.due_date ASC`,
    [societyId],
  );
  return result.rows.map(mapInvoice);
}
