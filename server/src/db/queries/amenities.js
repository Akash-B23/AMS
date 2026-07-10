function mapAmenity(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAmenities(client, societyId) {
  const result = await client.query(
    `SELECT id, society_id, name, description, is_active, created_at, updated_at
     FROM amenities
     WHERE society_id = $1 AND is_active = true
     ORDER BY name`,
    [societyId],
  );
  return result.rows.map(mapAmenity);
}

export async function findAmenityByName(client, societyId, name) {
  const result = await client.query(
    `SELECT id, society_id, name, description, is_active, created_at, updated_at
     FROM amenities
     WHERE society_id = $1 AND name = $2
     LIMIT 1`,
    [societyId, name],
  );
  return result.rows[0] ? mapAmenity(result.rows[0]) : null;
}

export async function createAmenity(client, societyId, { name, description = null }) {
  const result = await client.query(
    `INSERT INTO amenities (society_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING id, society_id, name, description, is_active, created_at, updated_at`,
    [societyId, name, description],
  );
  return mapAmenity(result.rows[0]);
}

export async function countAmenities(client, societyId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM amenities
     WHERE society_id = $1 AND is_active = true`,
    [societyId],
  );
  return result.rows[0].count;
}
