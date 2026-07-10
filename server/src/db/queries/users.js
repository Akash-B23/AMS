function mapUser(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    email: row.email,
    displayName: row.display_name ?? null,
    passwordHash: row.password_hash,
    role: row.role,
    residentId: row.resident_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublic(user, society = null) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    residentId: user.residentId,
    societyId: user.societyId ?? null,
    societySlug: society?.slug ?? null,
    societyName: society?.name ?? null,
    setupComplete: society?.setupCompletedAt != null,
  };
}

export async function findUserByEmailAndSociety(client, email, societyId) {
  const result = await client.query(
    `SELECT id, society_id, email, display_name, password_hash, role, resident_id, is_active, created_at, updated_at
     FROM users
     WHERE email = $1 AND society_id = $2
     LIMIT 1`,
    [email.toLowerCase(), societyId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findPlatformUserByEmail(client, email) {
  const result = await client.query(
    `SELECT id, society_id, email, display_name, password_hash, role, resident_id, is_active, created_at, updated_at
     FROM users
     WHERE email = $1 AND role = 'platform_superadmin'
     LIMIT 1`,
    [email.toLowerCase()],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(client, id) {
  const result = await client.query(
    `SELECT id, society_id, email, display_name, password_hash, role, resident_id, is_active, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserPublicById(client, id, society = null) {
  const user = await findUserById(client, id);
  return user ? toPublic(user, society) : null;
}

export async function createUser(
  client,
  { societyId, email, passwordHash, role, displayName = null, residentId = null },
) {
  const result = await client.query(
    `INSERT INTO users (society_id, email, password_hash, role, display_name, resident_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, society_id, email, display_name, password_hash, role, resident_id, is_active, created_at, updated_at`,
    [societyId, email.toLowerCase(), passwordHash, role, displayName, residentId],
  );
  return mapUser(result.rows[0]);
}

export async function updateDisplayName(client, userId, displayName) {
  const result = await client.query(
    `UPDATE users
     SET display_name = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, society_id, email, display_name, password_hash, role, resident_id, is_active, created_at, updated_at`,
    [displayName, userId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export { toPublic };
