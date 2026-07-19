import {
  getSocietyResidents,
  moveInResident,
  moveOutResident,
} from "../services/residentOccupancyService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listResidentsHandler(req, res) {
  const result = await getSocietyResidents(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function moveInHandler(req, res) {
  const result = await moveInResident(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "flat_not_found") {
    res.status(404).json({ error: "Flat not found" });
    return;
  }
  if (result.error === "email_taken") {
    res.status(409).json({ error: "Email is already in use in this society" });
    return;
  }
  if (result.error === "type_occupied") {
    res.status(409).json({
      error: result.message ?? "Flat already has an active resident of that type",
    });
    return;
  }
  res.status(201).json(result);
}

export async function moveOutHandler(req, res) {
  const result = await moveOutResident(
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
    res.status(404).json({ error: "Resident not found" });
    return;
  }
  if (result.error === "already_inactive") {
    res.status(409).json({ error: "Resident is already inactive" });
    return;
  }
  if (result.error === "pending_dues") {
    res.status(409).json({
      error: "Flat has pending dues; confirm to continue",
      code: "pending_dues",
      pendingInvoiceCount: result.pendingInvoiceCount,
      pendingAmountPaise: result.pendingAmountPaise,
    });
    return;
  }
  res.json(result);
}
