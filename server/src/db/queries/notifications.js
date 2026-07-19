function mapNotification(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    meta: row.meta ?? {},
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export async function createNotification(
  client,
  { societyId, userId, type, title, body, meta },
) {
  const result = await client.query(
    `INSERT INTO notifications (society_id, user_id, type, title, body, meta)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, society_id, user_id, type, title, body, meta, read_at, created_at`,
    [societyId, userId, type, title, body, JSON.stringify(meta ?? {})],
  );
  return mapNotification(result.rows[0]);
}

export async function listNotificationsForUser(
  client,
  { societyId, userId, limit = 50, offset = 0 },
) {
  const result = await client.query(
    `SELECT id, society_id, user_id, type, title, body, meta, read_at, created_at
     FROM notifications
     WHERE society_id = $1 AND user_id = $2
     ORDER BY read_at NULLS FIRST, created_at DESC
     LIMIT $3 OFFSET $4`,
    [societyId, userId, limit, offset],
  );
  return result.rows.map(mapNotification);
}

export async function countUnreadNotifications(client, { societyId, userId }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE society_id = $1 AND user_id = $2 AND read_at IS NULL`,
    [societyId, userId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function markNotificationRead(client, { notificationId, userId, societyId }) {
  const result = await client.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2 AND society_id = $3
     RETURNING id, society_id, user_id, type, title, body, meta, read_at, created_at`,
    [notificationId, userId, societyId],
  );
  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

export async function markAllNotificationsRead(client, { societyId, userId }) {
  const result = await client.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE society_id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [societyId, userId],
  );
  return result.rowCount ?? 0;
}
