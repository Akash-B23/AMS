function mapQuotation(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    vendorId: row.vendor_id,
    title: row.title,
    description: row.description ?? null,
    amountPaise: row.amount_paise,
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id ?? null,
    reviewedAt: row.reviewed_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendorName: row.vendor_name ?? null,
  };
}

const QUOTATION_SELECT = `
  SELECT q.id, q.society_id, q.vendor_id, q.title, q.description,
         q.amount_paise, q.status, q.submitted_by_user_id,
         q.reviewed_by_user_id, q.reviewed_at, q.rejection_reason,
         q.created_at, q.updated_at,
         v.name AS vendor_name
  FROM quotations q
  JOIN vendors v ON v.id = q.vendor_id
`;

export async function createQuotation(
  client,
  {
    societyId,
    vendorId,
    title,
    description,
    amountPaise,
    submittedByUserId,
  },
) {
  const result = await client.query(
    `INSERT INTO quotations (
       society_id, vendor_id, title, description, amount_paise,
       submitted_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      societyId,
      vendorId,
      title,
      description ?? null,
      amountPaise,
      submittedByUserId,
    ],
  );
  return findQuotationById(client, result.rows[0].id);
}

export async function findQuotationById(client, quotationId) {
  const result = await client.query(
    `${QUOTATION_SELECT}
     WHERE q.id = $1
     LIMIT 1`,
    [quotationId],
  );
  return result.rows[0] ? mapQuotation(result.rows[0]) : null;
}

export async function listQuotations(client, societyId, { status } = {}) {
  const conditions = ["q.society_id = $1"];
  const params = [societyId];

  if (status) {
    conditions.push("q.status = $2");
    params.push(status);
  }

  const result = await client.query(
    `${QUOTATION_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY q.created_at DESC`,
    params,
  );
  return result.rows.map(mapQuotation);
}

export async function updateQuotationReview(
  client,
  quotationId,
  { status, reviewedByUserId, rejectionReason },
) {
  const result = await client.query(
    `UPDATE quotations
     SET status = $2,
         reviewed_by_user_id = $3,
         reviewed_at = NOW(),
         rejection_reason = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [quotationId, status, reviewedByUserId, rejectionReason ?? null],
  );
  if (!result.rows[0]) return null;
  return findQuotationById(client, result.rows[0].id);
}
