function mapUser(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    email: row.email,
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
    role: user.role,
    residentId: user.residentId,
    societyId: user.societyId ?? null,
    societySlug: society?.slug ?? null,
    societyName: society?.name ?? null,
  };
}

export async function findUserByEmailAndSociety(client, email, societyId) {
  const result = await client.query(
    `SELECT id, society_id, email, password_hash, role, resident_id, is_active, created_at, updated_at
     FROM users
     WHERE email = $1 AND society_id = $2
     LIMIT 1`,
    [email.toLowerCase(), societyId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findPlatformUserByEmail(client, email) {
  const result = await client.query(
    `SELECT id, society_id, email, password_hash, role, resident_id, is_active, created_at, updated_at
     FROM users
     WHERE email = $1 AND role = 'platform_superadmin'
     LIMIT 1`,
    [email.toLowerCase()],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(client, id) {
  const result = await client.query(
    `SELECT id, society_id, email, password_hash, role, resident_id, is_active, created_at, updated_at
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

export { toPublic };
