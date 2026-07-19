function mapVendor(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    name: row.name,
    contactName: row.contact_name ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    notes: row.notes ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createVendor(
  client,
  { societyId, name, contactName, phone, email, notes },
) {
  const result = await client.query(
    `INSERT INTO vendors (
       society_id, name, contact_name, phone, email, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, society_id, name, contact_name, phone, email, notes,
               is_active, created_at, updated_at`,
    [
      societyId,
      name,
      contactName ?? null,
      phone ?? null,
      email ?? null,
      notes ?? null,
    ],
  );
  return mapVendor(result.rows[0]);
}

export async function findVendorById(client, vendorId) {
  const result = await client.query(
    `SELECT id, society_id, name, contact_name, phone, email, notes,
            is_active, created_at, updated_at
     FROM vendors
     WHERE id = $1
     LIMIT 1`,
    [vendorId],
  );
  return result.rows[0] ? mapVendor(result.rows[0]) : null;
}

export async function listVendors(client, societyId, { activeOnly } = {}) {
  const conditions = ["society_id = $1"];
  const params = [societyId];

  if (activeOnly) {
    conditions.push("is_active = true");
  }

  const result = await client.query(
    `SELECT id, society_id, name, contact_name, phone, email, notes,
            is_active, created_at, updated_at
     FROM vendors
     WHERE ${conditions.join(" AND ")}
     ORDER BY name ASC`,
    params,
  );
  return result.rows.map(mapVendor);
}

export async function updateVendor(
  client,
  vendorId,
  { name, contactName, phone, email, notes, isActive },
) {
  const result = await client.query(
    `UPDATE vendors
     SET name = COALESCE($2, name),
         contact_name = CASE WHEN $3::boolean THEN $4 ELSE contact_name END,
         phone = CASE WHEN $5::boolean THEN $6 ELSE phone END,
         email = CASE WHEN $7::boolean THEN $8 ELSE email END,
         notes = CASE WHEN $9::boolean THEN $10 ELSE notes END,
         is_active = COALESCE($11, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, society_id, name, contact_name, phone, email, notes,
               is_active, created_at, updated_at`,
    [
      vendorId,
      name ?? null,
      contactName !== undefined,
      contactName ?? null,
      phone !== undefined,
      phone ?? null,
      email !== undefined,
      email ?? null,
      notes !== undefined,
      notes ?? null,
      isActive ?? null,
    ],
  );
  return result.rows[0] ? mapVendor(result.rows[0]) : null;
}
