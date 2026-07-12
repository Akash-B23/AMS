export async function createAuditLog(
  client,
  { societyId, actorUserId, action, entityType, entityId = null, meta = {} },
) {
  const result = await client.query(
    `INSERT INTO audit_logs (
       society_id, actor_user_id, action, entity_type, entity_id, meta
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, society_id, actor_user_id, action, entity_type, entity_id,
               meta, created_at`,
    [
      societyId,
      actorUserId,
      action,
      entityType,
      entityId,
      JSON.stringify(meta),
    ],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    societyId: row.society_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    meta: row.meta,
    createdAt: row.created_at,
  };
}
