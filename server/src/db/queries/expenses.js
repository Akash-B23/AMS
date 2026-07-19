function mapExpense(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    vendorId: row.vendor_id ?? null,
    quotationId: row.quotation_id ?? null,
    category: row.category,
    title: row.title,
    description: row.description ?? null,
    amountPaise: row.amount_paise,
    expenseDate: row.expense_date,
    recordedByUserId: row.recorded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendorName: row.vendor_name ?? null,
    quotationTitle: row.quotation_title ?? null,
  };
}

const EXPENSE_SELECT = `
  SELECT e.id, e.society_id, e.vendor_id, e.quotation_id, e.category,
         e.title, e.description, e.amount_paise, e.expense_date,
         e.recorded_by_user_id, e.created_at, e.updated_at,
         v.name AS vendor_name,
         q.title AS quotation_title
  FROM expenses e
  LEFT JOIN vendors v ON v.id = e.vendor_id
  LEFT JOIN quotations q ON q.id = e.quotation_id
`;

export async function createExpense(
  client,
  {
    societyId,
    vendorId,
    quotationId,
    category,
    title,
    description,
    amountPaise,
    expenseDate,
    recordedByUserId,
  },
) {
  const result = await client.query(
    `INSERT INTO expenses (
       society_id, vendor_id, quotation_id, category, title, description,
       amount_paise, expense_date, recorded_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9)
     RETURNING id`,
    [
      societyId,
      vendorId ?? null,
      quotationId ?? null,
      category,
      title,
      description ?? null,
      amountPaise,
      expenseDate,
      recordedByUserId,
    ],
  );
  return findExpenseById(client, result.rows[0].id);
}

export async function findExpenseById(client, expenseId) {
  const result = await client.query(
    `${EXPENSE_SELECT}
     WHERE e.id = $1
     LIMIT 1`,
    [expenseId],
  );
  return result.rows[0] ? mapExpense(result.rows[0]) : null;
}

export async function listExpenses(client, societyId, { category } = {}) {
  const conditions = ["e.society_id = $1"];
  const params = [societyId];

  if (category) {
    conditions.push("e.category = $2");
    params.push(category);
  }

  const result = await client.query(
    `${EXPENSE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    params,
  );
  return result.rows.map(mapExpense);
}
