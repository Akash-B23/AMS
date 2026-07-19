function mapSchedule(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    title: row.title,
    description: row.description ?? null,
    category: row.category,
    vendorId: row.vendor_id ?? null,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week ?? null,
    dayOfMonth: row.day_of_month ?? null,
    notifyDaysBefore: row.notify_days_before,
    isActive: row.is_active,
    nextDueDate: String(row.next_due_date).slice(0, 10),
    lastGeneratedAt: row.last_generated_at ?? null,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendorName: row.vendor_name ?? null,
  };
}

const SCHEDULE_SELECT = `
  SELECT s.id, s.society_id, s.title, s.description, s.category, s.vendor_id,
         s.frequency, s.day_of_week, s.day_of_month, s.notify_days_before,
         s.is_active, s.next_due_date::text AS next_due_date,
         s.last_generated_at, s.created_by_user_id,
         s.created_at, s.updated_at, v.name AS vendor_name
  FROM maintenance_schedules s
  LEFT JOIN vendors v ON v.id = s.vendor_id
`;

export async function createMaintenanceSchedule(
  client,
  {
    societyId,
    title,
    description,
    category,
    vendorId,
    frequency,
    dayOfWeek,
    dayOfMonth,
    notifyDaysBefore,
    nextDueDate,
    createdByUserId,
  },
) {
  const result = await client.query(
    `INSERT INTO maintenance_schedules (
       society_id, title, description, category, vendor_id, frequency,
       day_of_week, day_of_month, notify_days_before, next_due_date,
       created_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11)
     RETURNING id`,
    [
      societyId,
      title,
      description ?? null,
      category,
      vendorId ?? null,
      frequency,
      dayOfWeek ?? null,
      dayOfMonth ?? null,
      notifyDaysBefore ?? 3,
      nextDueDate,
      createdByUserId,
    ],
  );
  return findMaintenanceScheduleById(client, result.rows[0].id);
}

export async function findMaintenanceScheduleById(client, scheduleId) {
  const result = await client.query(
    `${SCHEDULE_SELECT}
     WHERE s.id = $1
     LIMIT 1`,
    [scheduleId],
  );
  return result.rows[0] ? mapSchedule(result.rows[0]) : null;
}

export async function listMaintenanceSchedules(client, societyId, { isActive } = {}) {
  const conditions = ["s.society_id = $1"];
  const params = [societyId];

  if (isActive !== undefined) {
    conditions.push("s.is_active = $2");
    params.push(isActive);
  }

  const result = await client.query(
    `${SCHEDULE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.next_due_date ASC, s.created_at DESC`,
    params,
  );
  return result.rows.map(mapSchedule);
}

export async function listDueMaintenanceSchedules(client, societyId, asOfDate) {
  const result = await client.query(
    `${SCHEDULE_SELECT}
     WHERE s.society_id = $1
       AND s.is_active = true
       AND s.next_due_date <= $2::date
     ORDER BY s.next_due_date ASC`,
    [societyId, asOfDate],
  );
  return result.rows.map(mapSchedule);
}

export async function listAllDueMaintenanceSchedules(client, asOfDate) {
  const result = await client.query(
    `${SCHEDULE_SELECT}
     WHERE s.is_active = true
       AND s.next_due_date <= $1::date
     ORDER BY s.society_id, s.next_due_date ASC`,
    [asOfDate],
  );
  return result.rows.map(mapSchedule);
}

export async function updateMaintenanceSchedule(
  client,
  scheduleId,
  {
    title,
    description,
    category,
    vendorId,
    frequency,
    dayOfWeek,
    dayOfMonth,
    notifyDaysBefore,
    isActive,
    nextDueDate,
    lastGeneratedAt,
  },
) {
  const result = await client.query(
    `UPDATE maintenance_schedules
     SET title = COALESCE($2, title),
         description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         category = COALESCE($5, category),
         vendor_id = CASE WHEN $6::boolean THEN $7 ELSE vendor_id END,
         frequency = COALESCE($8, frequency),
         day_of_week = CASE WHEN $9::boolean THEN $10 ELSE day_of_week END,
         day_of_month = CASE WHEN $11::boolean THEN $12 ELSE day_of_month END,
         notify_days_before = COALESCE($13, notify_days_before),
         is_active = COALESCE($14, is_active),
         next_due_date = COALESCE($15::date, next_due_date),
         last_generated_at = CASE WHEN $16::boolean THEN $17 ELSE last_generated_at END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [
      scheduleId,
      title ?? null,
      description !== undefined,
      description ?? null,
      category ?? null,
      vendorId !== undefined,
      vendorId ?? null,
      frequency ?? null,
      dayOfWeek !== undefined,
      dayOfWeek ?? null,
      dayOfMonth !== undefined,
      dayOfMonth ?? null,
      notifyDaysBefore ?? null,
      isActive ?? null,
      nextDueDate ?? null,
      lastGeneratedAt !== undefined,
      lastGeneratedAt ?? null,
    ],
  );
  if (!result.rows[0]) return null;
  return findMaintenanceScheduleById(client, result.rows[0].id);
}
