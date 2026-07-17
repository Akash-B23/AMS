function mapComplaint(row) {
  return {
    id: row.id,
    societyId: row.society_id,
    flatId: row.flat_id,
    raisedByResidentId: row.raised_by_resident_id,
    raisedByUserId: row.raised_by_user_id,
    category: row.category,
    title: row.title,
    description: row.description,
    status: row.status,
    staffNotes: row.staff_notes ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flatNumber: row.flat_number ?? null,
    blockName: row.block_name ?? null,
    residentName: row.resident_name ?? null,
  };
}

const COMPLAINT_SELECT = `
  SELECT c.id, c.society_id, c.flat_id, c.raised_by_resident_id, c.raised_by_user_id,
         c.category, c.title, c.description, c.status, c.staff_notes, c.resolved_at,
         c.created_at, c.updated_at,
         f.flat_number, b.name AS block_name, r.name AS resident_name
  FROM complaints c
  JOIN flats f ON f.id = c.flat_id
  JOIN blocks b ON b.id = f.block_id
  JOIN residents r ON r.id = c.raised_by_resident_id
`;

export async function createComplaint(
  client,
  {
    societyId,
    flatId,
    raisedByResidentId,
    raisedByUserId,
    category,
    title,
    description,
  },
) {
  const result = await client.query(
    `INSERT INTO complaints (
       society_id, flat_id, raised_by_resident_id, raised_by_user_id,
       category, title, description
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      societyId,
      flatId,
      raisedByResidentId,
      raisedByUserId,
      category,
      title,
      description,
    ],
  );
  return findComplaintById(client, result.rows[0].id);
}

export async function findComplaintById(client, complaintId) {
  const result = await client.query(
    `${COMPLAINT_SELECT}
     WHERE c.id = $1
     LIMIT 1`,
    [complaintId],
  );
  return result.rows[0] ? mapComplaint(result.rows[0]) : null;
}

export async function listComplaintsForSociety(
  client,
  societyId,
  { status } = {},
) {
  const conditions = ["c.society_id = $1"];
  const params = [societyId];

  if (status) {
    conditions.push("c.status = $2");
    params.push(status);
  }

  const result = await client.query(
    `${COMPLAINT_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.created_at DESC`,
    params,
  );
  return result.rows.map(mapComplaint);
}

export async function listComplaintsForResident(
  client,
  societyId,
  residentId,
) {
  const result = await client.query(
    `${COMPLAINT_SELECT}
     WHERE c.society_id = $1 AND c.raised_by_resident_id = $2
     ORDER BY c.created_at DESC`,
    [societyId, residentId],
  );
  return result.rows.map(mapComplaint);
}

export async function updateComplaintStatus(
  client,
  complaintId,
  { status, staffNotes, resolvedAt },
) {
  const result = await client.query(
    `UPDATE complaints
     SET status = $2,
         staff_notes = COALESCE($3, staff_notes),
         resolved_at = COALESCE($4, resolved_at),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [complaintId, status, staffNotes ?? null, resolvedAt ?? null],
  );
  if (!result.rows[0]) return null;
  return findComplaintById(client, result.rows[0].id);
}
