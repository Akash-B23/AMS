function mapSociety(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findSocietyBySlug(client, slug) {
  const result = await client.query(
    `SELECT id, name, slug, is_active, created_at, updated_at
     FROM societies
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  return result.rows[0] ? mapSociety(result.rows[0]) : null;
}

export async function findSocietyById(client, id) {
  const result = await client.query(
    `SELECT id, name, slug, is_active, created_at, updated_at
     FROM societies
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapSociety(result.rows[0]) : null;
}
