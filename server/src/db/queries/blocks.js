function mapBlock(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBlocks(client, societyId) {
  const result = await client.query(
    `SELECT id, society_id, name, is_active, created_at, updated_at
     FROM blocks
     WHERE society_id = $1 AND is_active = true
     ORDER BY name`,
    [societyId],
  );
  return result.rows.map(mapBlock);
}

export async function findBlockByName(client, societyId, name) {
  const result = await client.query(
    `SELECT id, society_id, name, is_active, created_at, updated_at
     FROM blocks
     WHERE society_id = $1 AND name = $2
     LIMIT 1`,
    [societyId, name],
  );
  return result.rows[0] ? mapBlock(result.rows[0]) : null;
}

export async function createBlock(client, societyId, name) {
  const result = await client.query(
    `INSERT INTO blocks (society_id, name)
     VALUES ($1, $2)
     RETURNING id, society_id, name, is_active, created_at, updated_at`,
    [societyId, name],
  );
  return mapBlock(result.rows[0]);
}

export async function getOrCreateBlock(client, societyId, name) {
  const existing = await findBlockByName(client, societyId, name);
  if (existing) {
    return existing;
  }
  return createBlock(client, societyId, name);
}
