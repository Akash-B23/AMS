function mapPayment(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    invoiceId: row.invoice_id,
    amountPaise: row.amount_paise,
    method: row.method,
    status: row.status,
    transactionRef: row.transaction_ref ?? null,
    recordedByUserId: row.recorded_by_user_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PAYMENT_COLUMNS = `id, society_id, invoice_id, amount_paise, method, status,
  transaction_ref, recorded_by_user_id, notes, created_at, updated_at`;

export async function createPayment(
  client,
  {
    societyId,
    invoiceId,
    amountPaise,
    method,
    status = "created",
    transactionRef = null,
    recordedByUserId = null,
    notes = null,
  },
) {
  const result = await client.query(
    `INSERT INTO payments (
       society_id, invoice_id, amount_paise, method, status,
       transaction_ref, recorded_by_user_id, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PAYMENT_COLUMNS}`,
    [
      societyId,
      invoiceId,
      amountPaise,
      method,
      status,
      transactionRef,
      recordedByUserId,
      notes,
    ],
  );
  return mapPayment(result.rows[0]);
}

export async function findOpenPaymentForInvoice(client, invoiceId) {
  const result = await client.query(
    `SELECT ${PAYMENT_COLUMNS}
     FROM payments
     WHERE invoice_id = $1
       AND status = 'created'
     ORDER BY created_at DESC
     LIMIT 1`,
    [invoiceId],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

export async function capturePayment(client, paymentId, { notes } = {}) {
  const result = await client.query(
    `UPDATE payments
     SET status = 'captured',
         notes = COALESCE($2, notes),
         updated_at = NOW()
     WHERE id = $1 AND status = 'created'
     RETURNING ${PAYMENT_COLUMNS}`,
    [paymentId, notes ?? null],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

export async function failPayment(client, paymentId, { notes } = {}) {
  const result = await client.query(
    `UPDATE payments
     SET status = 'failed',
         notes = COALESCE($2, notes),
         updated_at = NOW()
     WHERE id = $1 AND status = 'created'
     RETURNING ${PAYMENT_COLUMNS}`,
    [paymentId, notes ?? null],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}
