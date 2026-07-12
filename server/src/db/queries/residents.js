function mapResident(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    flatId: row.flat_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    residentType: row.resident_type,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flatNumber: row.flat_number ?? null,
    blockName: row.block_name ?? null,
    floor: row.floor ?? null,
  };
}

export async function findResidentById(client, residentId) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, name, phone, email, resident_type,
            is_active, created_at, updated_at
     FROM residents
     WHERE id = $1
     LIMIT 1`,
    [residentId],
  );
  return result.rows[0]
    ? mapResident(result.rows[0])
    : null;
}

export async function findResidentWithFlat(client, residentId) {
  const result = await client.query(
    `SELECT r.id, r.society_id, r.flat_id, r.name, r.phone, r.email,
            r.resident_type, r.is_active, r.created_at, r.updated_at,
            f.flat_number, f.floor, b.name AS block_name
     FROM residents r
     JOIN flats f ON f.id = r.flat_id
     JOIN blocks b ON b.id = f.block_id
     WHERE r.id = $1 AND r.is_active = true
     LIMIT 1`,
    [residentId],
  );
  return result.rows[0]
    ? mapResident(result.rows[0])
    : null;
}

/**
 * Billing occupant for a flat: prefer active tenant, else active owner.
 * Documented product rule — no DB uniqueness on (flat_id, resident_type).
 */
export async function findBillingResidentForFlat(client, societyId, flatId) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, name, phone, email, resident_type,
            is_active, created_at, updated_at
     FROM residents
     WHERE society_id = $1
       AND flat_id = $2
       AND is_active = true
       AND resident_type IN ('tenant', 'owner')
     ORDER BY CASE resident_type
                WHEN 'tenant' THEN 0
                WHEN 'owner' THEN 1
                ELSE 2
              END,
              created_at ASC
     LIMIT 1`,
    [societyId, flatId],
  );
  return result.rows[0] ? mapResident(result.rows[0]) : null;
}

export async function updateResidentContact(client, residentId, { name, phone }) {
  const result = await client.query(
    `UPDATE residents
     SET name = $1, phone = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, society_id, flat_id, name, phone, email, resident_type,
               is_active, created_at, updated_at`,
    [name, phone ?? null, residentId],
  );
  return result.rows[0]
    ? mapResident(result.rows[0])
    : null;
}
