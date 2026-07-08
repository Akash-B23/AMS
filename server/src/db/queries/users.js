import { sql } from "../client.js";

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    residentId: row.resident_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublic(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    residentId: user.residentId,
  };
}

export async function findUserByEmail(email) {
  const rows = await sql`
    SELECT id, email, password_hash, role, resident_id, is_active, created_at, updated_at
    FROM users
    WHERE email = ${email.toLowerCase()}
    LIMIT 1
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id) {
  const rows = await sql`
    SELECT id, email, password_hash, role, resident_id, is_active, created_at, updated_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserPublicById(id) {
  const user = await findUserById(id);
  return user ? toPublic(user) : null;
}
