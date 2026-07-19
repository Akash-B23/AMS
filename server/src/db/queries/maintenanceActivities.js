function mapActivity(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    vendorId: row.vendor_id ?? null,
    category: row.category,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    activityDate: row.activity_date,
    loggedByUserId: row.logged_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendorName: row.vendor_name ?? null,
  };
}

const ACTIVITY_SELECT = `
  SELECT a.id, a.society_id, a.vendor_id, a.category, a.title, a.description,
         a.status, a.activity_date, a.logged_by_user_id, a.created_at, a.updated_at,
         v.name AS vendor_name
  FROM maintenance_activities a
  LEFT JOIN vendors v ON v.id = a.vendor_id
`;

export async function createMaintenanceActivity(
  client,
  {
    societyId,
    vendorId,
    category,
    title,
    description,
    status,
    activityDate,
    loggedByUserId,
  },
) {
  const result = await client.query(
    `INSERT INTO maintenance_activities (
       society_id, vendor_id, category, title, description, status,
       activity_date, logged_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8)
     RETURNING id`,
    [
      societyId,
      vendorId ?? null,
      category,
      title,
      description ?? null,
      status,
      activityDate,
      loggedByUserId,
    ],
  );
  return findMaintenanceActivityById(client, result.rows[0].id);
}

export async function findMaintenanceActivityById(client, activityId) {
  const result = await client.query(
    `${ACTIVITY_SELECT}
     WHERE a.id = $1
     LIMIT 1`,
    [activityId],
  );
  return result.rows[0] ? mapActivity(result.rows[0]) : null;
}

export async function listMaintenanceActivities(
  client,
  societyId,
  { status, category } = {},
) {
  const conditions = ["a.society_id = $1"];
  const params = [societyId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`a.status = $${paramIndex}`);
    params.push(status);
    paramIndex += 1;
  }
  if (category) {
    conditions.push(`a.category = $${paramIndex}`);
    params.push(category);
  }

  const result = await client.query(
    `${ACTIVITY_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.activity_date DESC, a.created_at DESC`,
    params,
  );
  return result.rows.map(mapActivity);
}

export async function updateMaintenanceActivity(
  client,
  activityId,
  { status, description, title },
) {
  const result = await client.query(
    `UPDATE maintenance_activities
     SET status = COALESCE($2, status),
         description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         title = COALESCE($5, title),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [
      activityId,
      status ?? null,
      description !== undefined,
      description ?? null,
      title ?? null,
    ],
  );
  if (!result.rows[0]) return null;
  return findMaintenanceActivityById(client, result.rows[0].id);
}
