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
    movedInAt: row.moved_in_at ?? null,
    movedOutAt: row.moved_out_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flatNumber: row.flat_number ?? null,
    blockName: row.block_name ?? null,
    blockId: row.block_id ?? null,
    floor: row.floor ?? null,
    hasLogin: row.has_login ?? undefined,
    userEmail: row.user_email ?? null,
  };
}

export async function findResidentById(client, residentId) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, name, phone, email, resident_type,
            is_active, moved_in_at, moved_out_at, created_at, updated_at
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
            r.resident_type, r.is_active, r.moved_in_at, r.moved_out_at,
            r.created_at, r.updated_at,
            f.flat_number, f.floor, b.name AS block_name, b.id AS block_id
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
 * At most one active owner and one active tenant per flat (partial unique indexes).
 */
export async function findBillingResidentForFlat(client, societyId, flatId) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, name, phone, email, resident_type,
            is_active, moved_in_at, moved_out_at, created_at, updated_at
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

export async function listResidents(
  client,
  societyId,
  { blockId = null, activeOnly = true } = {},
) {
  const conditions = ["r.society_id = $1"];
  const params = [societyId];
  let idx = 2;

  if (activeOnly) {
    conditions.push("r.is_active = true");
  }
  if (blockId) {
    conditions.push(`b.id = $${idx}`);
    params.push(blockId);
    idx += 1;
  }

  const result = await client.query(
    `SELECT r.id, r.society_id, r.flat_id, r.name, r.phone, r.email,
            r.resident_type, r.is_active, r.moved_in_at, r.moved_out_at,
            r.created_at, r.updated_at,
            f.flat_number, f.floor, b.name AS block_name, b.id AS block_id,
            (u.id IS NOT NULL) AS has_login,
            u.email AS user_email
     FROM residents r
     JOIN flats f ON f.id = r.flat_id
     JOIN blocks b ON b.id = f.block_id
     LEFT JOIN users u ON u.resident_id = r.id AND u.is_active = true
     WHERE ${conditions.join(" AND ")}
     ORDER BY b.name, f.flat_number, r.resident_type, r.name`,
    params,
  );
  return result.rows.map(mapResident);
}

export async function createResident(
  client,
  {
    societyId,
    flatId,
    name,
    phone = null,
    email,
    residentType,
    movedInAt = new Date(),
  },
) {
  const result = await client.query(
    `INSERT INTO residents (
       society_id, flat_id, name, phone, email, resident_type, moved_in_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, society_id, flat_id, name, phone, email, resident_type,
               is_active, moved_in_at, moved_out_at, created_at, updated_at`,
    [societyId, flatId, name, phone, email, residentType, movedInAt],
  );
  return mapResident(result.rows[0]);
}

export async function deactivateResident(client, residentId) {
  const result = await client.query(
    `UPDATE residents
     SET is_active = false,
         moved_out_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND is_active = true
     RETURNING id, society_id, flat_id, name, phone, email, resident_type,
               is_active, moved_in_at, moved_out_at, created_at, updated_at`,
    [residentId],
  );
  return result.rows[0] ? mapResident(result.rows[0]) : null;
}

export async function getPendingDuesForFlat(client, societyId, flatId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS pending_count,
            COALESCE(SUM(amount_paise), 0)::bigint AS pending_amount_paise
     FROM invoices
     WHERE society_id = $1
       AND flat_id = $2
       AND status = 'pending'`,
    [societyId, flatId],
  );
  const row = result.rows[0];
  return {
    pendingInvoiceCount: row.pending_count,
    pendingAmountPaise: Number(row.pending_amount_paise),
  };
}

export async function findActiveResidentOfType(
  client,
  societyId,
  flatId,
  residentType,
) {
  const result = await client.query(
    `SELECT id, society_id, flat_id, name, phone, email, resident_type,
            is_active, moved_in_at, moved_out_at, created_at, updated_at
     FROM residents
     WHERE society_id = $1
       AND flat_id = $2
       AND resident_type = $3
       AND is_active = true
     LIMIT 1`,
    [societyId, flatId, residentType],
  );
  return result.rows[0] ? mapResident(result.rows[0]) : null;
}

export async function updateResidentContact(client, residentId, { name, phone }) {
  const result = await client.query(
    `UPDATE residents
     SET name = $1, phone = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, society_id, flat_id, name, phone, email, resident_type,
               is_active, moved_in_at, moved_out_at, created_at, updated_at`,
    [name, phone ?? null, residentId],
  );
  return result.rows[0]
    ? mapResident(result.rows[0])
    : null;
}
