function mapSociety(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    setupCompletedAt: row.setup_completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findSocietyBySlug(client, slug) {
  const result = await client.query(
    `SELECT id, name, slug, is_active, setup_completed_at, created_at, updated_at
     FROM societies
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  return result.rows[0] ? mapSociety(result.rows[0]) : null;
}

export async function findSocietyById(client, id) {
  const result = await client.query(
    `SELECT id, name, slug, is_active, setup_completed_at, created_at, updated_at
     FROM societies
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapSociety(result.rows[0]) : null;
}

export async function isSlugAvailable(client, slug) {
  const result = await client.query(
    "SELECT 1 FROM societies WHERE slug = $1 LIMIT 1",
    [slug],
  );
  return result.rowCount === 0;
}

export async function createSociety(client, { name, slug }) {
  const result = await client.query(
    `INSERT INTO societies (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug, is_active, setup_completed_at, created_at, updated_at`,
    [name, slug],
  );
  return mapSociety(result.rows[0]);
}

export async function markSetupComplete(client, societyId) {
  const result = await client.query(
    `UPDATE societies
     SET setup_completed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, slug, is_active, setup_completed_at, created_at, updated_at`,
    [societyId],
  );
  return result.rows[0] ? mapSociety(result.rows[0]) : null;
}

export async function getSetupCounts(client, societyId) {
  const blocks = await client.query(
    "SELECT COUNT(*)::int AS count FROM blocks WHERE society_id = $1 AND is_active = true",
    [societyId],
  );
  const flats = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM flats
     WHERE society_id = $1 AND is_active = true`,
    [societyId],
  );
  const missingMaintenance = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM flats
     WHERE society_id = $1
       AND is_active = true
       AND maintenance_amount_paise IS NULL`,
    [societyId],
  );
  return {
    blockCount: blocks.rows[0].count,
    flatCount: flats.rows[0].count,
    flatsMissingMaintenance: missingMaintenance.rows[0].count,
  };
}
