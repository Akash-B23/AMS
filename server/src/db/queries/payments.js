function mapPayment(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    invoiceId: row.invoice_id,
    amountPaise: row.amount_paise,
    method: row.method,
    status: row.status,
    cashfreeOrderId: row.cashfree_order_id,
    cashfreePaymentId: row.cashfree_payment_id,
    recordedByUserId: row.recorded_by_user_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createPayment(
  client,
  {
    societyId,
    invoiceId,
    amountPaise,
    method,
    status = "created",
    cashfreeOrderId = null,
    cashfreePaymentId = null,
    recordedByUserId = null,
    notes = null,
  },
) {
  const result = await client.query(
    `INSERT INTO payments (
       society_id, invoice_id, amount_paise, method, status,
       cashfree_order_id, cashfree_payment_id, recorded_by_user_id, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, society_id, invoice_id, amount_paise, method, status,
               cashfree_order_id, cashfree_payment_id, recorded_by_user_id,
               notes, created_at, updated_at`,
    [
      societyId,
      invoiceId,
      amountPaise,
      method,
      status,
      cashfreeOrderId,
      cashfreePaymentId,
      recordedByUserId,
      notes,
    ],
  );
  return mapPayment(result.rows[0]);
}

export async function findPaymentByOrderId(client, cashfreeOrderId) {
  const result = await client.query(
    `SELECT id, society_id, invoice_id, amount_paise, method, status,
            cashfree_order_id, cashfree_payment_id, recorded_by_user_id,
            notes, created_at, updated_at
     FROM payments
     WHERE cashfree_order_id = $1
     LIMIT 1`,
    [cashfreeOrderId],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

export async function findPaymentByPaymentId(client, cashfreePaymentId) {
  const result = await client.query(
    `SELECT id, society_id, invoice_id, amount_paise, method, status,
            cashfree_order_id, cashfree_payment_id, recorded_by_user_id,
            notes, created_at, updated_at
     FROM payments
     WHERE cashfree_payment_id = $1
     LIMIT 1`,
    [cashfreePaymentId],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

export async function capturePayment(
  client,
  paymentId,
  { cashfreePaymentId, status = "captured" },
) {
  const result = await client.query(
    `UPDATE payments
     SET status = $2,
         cashfree_payment_id = COALESCE($3, cashfree_payment_id),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, society_id, invoice_id, amount_paise, method, status,
               cashfree_order_id, cashfree_payment_id, recorded_by_user_id,
               notes, created_at, updated_at`,
    [paymentId, status, cashfreePaymentId],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

export async function findOpenCashfreePaymentForInvoice(client, invoiceId) {
  const result = await client.query(
    `SELECT id, society_id, invoice_id, amount_paise, method, status,
            cashfree_order_id, cashfree_payment_id, recorded_by_user_id,
            notes, created_at, updated_at
     FROM payments
     WHERE invoice_id = $1
       AND method = 'cashfree'
       AND status = 'created'
     ORDER BY created_at DESC
     LIMIT 1`,
    [invoiceId],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}
