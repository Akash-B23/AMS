function mapDelivery(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    userId: row.user_id ?? null,
    toEmail: row.to_email,
    template: row.template,
    providerMessageId: row.provider_message_id ?? null,
    status: row.status,
    error: row.error ?? null,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

export async function createEmailDelivery(
  client,
  {
    societyId,
    userId,
    toEmail,
    template,
    providerMessageId,
    status,
    error,
    payload,
  },
) {
  const result = await client.query(
    `INSERT INTO email_deliveries (
       society_id, user_id, to_email, template, provider_message_id,
       status, error, payload
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, society_id, user_id, to_email, template, provider_message_id,
               status, error, payload, created_at`,
    [
      societyId,
      userId ?? null,
      toEmail,
      template,
      providerMessageId ?? null,
      status,
      error ?? null,
      JSON.stringify(payload ?? {}),
    ],
  );
  return mapDelivery(result.rows[0]);
}
