function mapVehicle(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    residentId: row.resident_id,
    registrationNumber: row.registration_number,
    vehicleType: row.vehicle_type,
    makeModel: row.make_model,
    parkingSlot: row.parking_slot,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVehiclesByResident(client, residentId) {
  const result = await client.query(
    `SELECT id, society_id, resident_id, registration_number, vehicle_type,
            make_model, parking_slot, is_active, created_at, updated_at
     FROM vehicles
     WHERE resident_id = $1 AND is_active = true
     ORDER BY created_at`,
    [residentId],
  );
  return result.rows.map(mapVehicle);
}

export async function findVehicleById(client, vehicleId) {
  const result = await client.query(
    `SELECT id, society_id, resident_id, registration_number, vehicle_type,
            make_model, parking_slot, is_active, created_at, updated_at
     FROM vehicles
     WHERE id = $1
     LIMIT 1`,
    [vehicleId],
  );
  return result.rows[0]
    ? mapVehicle(result.rows[0])
    : null;
}

export async function findByRegistration(client, societyId, registrationNumber) {
  const result = await client.query(
    `SELECT id, society_id, resident_id, registration_number, vehicle_type,
            make_model, parking_slot, is_active, created_at, updated_at
     FROM vehicles
     WHERE society_id = $1 AND registration_number = $2 AND is_active = true
     LIMIT 1`,
    [societyId, registrationNumber],
  );
  return result.rows[0]
    ? mapVehicle(result.rows[0])
    : null;
}

export async function countVehiclesByResident(client, residentId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM vehicles
     WHERE resident_id = $1 AND is_active = true`,
    [residentId],
  );
  return result.rows[0].count;
}

export async function createVehicle(
  client,
  societyId,
  residentId,
  { registrationNumber, vehicleType, makeModel = null, parkingSlot = null },
) {
  const result = await client.query(
    `INSERT INTO vehicles (
       society_id, resident_id, registration_number, vehicle_type, make_model, parking_slot
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, society_id, resident_id, registration_number, vehicle_type,
               make_model, parking_slot, is_active, created_at, updated_at`,
    [societyId, residentId, registrationNumber, vehicleType, makeModel, parkingSlot],
  );
  return mapVehicle(result.rows[0]);
}

export async function updateVehicle(client, vehicleId, residentId, data) {
  const result = await client.query(
    `UPDATE vehicles
     SET registration_number = $1,
         vehicle_type = $2,
         make_model = $3,
         parking_slot = $4,
         updated_at = NOW()
     WHERE id = $5 AND resident_id = $6 AND is_active = true
     RETURNING id, society_id, resident_id, registration_number, vehicle_type,
               make_model, parking_slot, is_active, created_at, updated_at`,
    [
      data.registrationNumber,
      data.vehicleType,
      data.makeModel ?? null,
      data.parkingSlot ?? null,
      vehicleId,
      residentId,
    ],
  );
  return result.rows[0]
    ? mapVehicle(result.rows[0])
    : null;
}

export async function softDeleteVehicle(client, vehicleId, residentId) {
  const result = await client.query(
    `UPDATE vehicles
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND resident_id = $2 AND is_active = true
     RETURNING id`,
    [vehicleId, residentId],
  );
  return result.rowCount > 0;
}
