function mapReminderLog(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    invoiceId: row.invoice_id,
    residentId: row.resident_id,
    channel: row.channel,
    status: row.status,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export async function createReminderLog(
  client,
  { societyId, invoiceId, residentId, channel = "email", status = "recorded", payload },
) {
  const result = await client.query(
    `INSERT INTO reminder_logs (
       society_id, invoice_id, resident_id, channel, status, payload
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, society_id, invoice_id, resident_id, channel, status,
               payload, created_at`,
    [
      societyId,
      invoiceId,
      residentId,
      channel,
      status,
      JSON.stringify(payload ?? {}),
    ],
  );
  return mapReminderLog(result.rows[0]);
}

export async function countRemindersForInvoiceToday(client, invoiceId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM reminder_logs
     WHERE invoice_id = $1
       AND created_at::date = CURRENT_DATE
       AND status = 'recorded'`,
    [invoiceId],
  );
  return result.rows[0].count;
}
