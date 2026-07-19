function mapFlat(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    blockId: row.block_id,
    blockName: row.block_name ?? null,
    flatNumber: row.flat_number,
    floor: row.floor,
    maintenanceAmountPaise: row.maintenance_amount_paise,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFlatsWithBlocks(client, societyId) {
  const result = await client.query(
    `SELECT f.id, f.society_id, f.block_id, b.name AS block_name,
            f.flat_number, f.floor, f.maintenance_amount_paise,
            f.is_active, f.created_at, f.updated_at
     FROM flats f
     JOIN blocks b ON b.id = f.block_id
     WHERE f.society_id = $1 AND f.is_active = true
     ORDER BY b.name, f.flat_number`,
    [societyId],
  );
  return result.rows.map(mapFlat);
}

export async function findFlatByBlockNameAndNumber(
  client,
  societyId,
  blockName,
  flatNumber,
) {
  const result = await client.query(
    `SELECT f.id, f.society_id, f.block_id, b.name AS block_name,
            f.flat_number, f.floor, f.maintenance_amount_paise,
            f.is_active, f.created_at, f.updated_at
     FROM flats f
     JOIN blocks b ON b.id = f.block_id
     WHERE f.society_id = $1 AND b.name = $2 AND f.flat_number = $3 AND f.is_active = true
     LIMIT 1`,
    [societyId, blockName, flatNumber],
  );
  return result.rows[0] ? mapFlat(result.rows[0]) : null;
}

export async function findFlatByBlockAndNumber(client, blockId, flatNumber) {
  const result = await client.query(
    `SELECT id, society_id, block_id, flat_number, floor, maintenance_amount_paise,
            is_active, created_at, updated_at
     FROM flats
     WHERE block_id = $1 AND flat_number = $2
     LIMIT 1`,
    [blockId, flatNumber],
  );
  return result.rows[0] ? mapFlat(result.rows[0]) : null;
}

export async function findFlatById(client, societyId, flatId) {
  const result = await client.query(
    `SELECT f.id, f.society_id, f.block_id, b.name AS block_name,
            f.flat_number, f.floor, f.maintenance_amount_paise,
            f.is_active, f.created_at, f.updated_at
     FROM flats f
     JOIN blocks b ON b.id = f.block_id
     WHERE f.society_id = $1 AND f.id = $2
     LIMIT 1`,
    [societyId, flatId],
  );
  return result.rows[0] ? mapFlat(result.rows[0]) : null;
}

export async function createFlat(
  client,
  { societyId, blockId, flatNumber, floor = null },
) {
  const result = await client.query(
    `INSERT INTO flats (society_id, block_id, flat_number, floor)
     VALUES ($1, $2, $3, $4)
     RETURNING id, society_id, block_id, flat_number, floor, maintenance_amount_paise,
               is_active, created_at, updated_at`,
    [societyId, blockId, flatNumber, floor],
  );
  return mapFlat(result.rows[0]);
}

export async function setMaintenanceAmounts(client, societyId, amounts) {
  for (const { flatId, maintenanceAmountPaise } of amounts) {
    await client.query(
      `UPDATE flats
       SET maintenance_amount_paise = $1, updated_at = NOW()
       WHERE id = $2 AND society_id = $3`,
      [maintenanceAmountPaise, flatId, societyId],
    );
  }
}
