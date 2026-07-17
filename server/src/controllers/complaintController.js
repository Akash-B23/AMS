import {
  createResidentComplaint,
  getResidentComplaintById,
  getResidentComplaints,
  getSocietyComplaints,
  updateSocietyComplaint,
} from "../services/complaintService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function createResidentComplaintHandler(req, res) {
  const result = await createResidentComplaint(
    req.user.id,
    req.user.societyId,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  res.status(201).json(result);
}

export async function listResidentComplaintsHandler(req, res) {
  const result = await getResidentComplaints(req.user.id, req.user.societyId);
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  res.json(result);
}

export async function getResidentComplaintHandler(req, res) {
  const result = await getResidentComplaintById(
    req.user.id,
    req.user.societyId,
    req.params.id,
  );
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  if (result.error === "forbidden") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(result);
}

export async function listSocietyComplaintsHandler(req, res) {
  const result = await getSocietyComplaints(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function updateSocietyComplaintHandler(req, res) {
  const result = await updateSocietyComplaint(
    req.user.societyId,
    req.user.id,
    req.params.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  if (result.error === "invalid_transition") {
    res.status(409).json({ error: "Invalid status transition" });
    return;
  }
  res.json(result);
}
