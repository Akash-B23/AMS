import {
  createSocietyMaintenanceActivity,
  getMaintenanceActivities,
  updateSocietyMaintenanceActivity,
} from "../services/maintenanceActivityService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listMaintenanceActivitiesHandler(req, res) {
  const result = await getMaintenanceActivities(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function createMaintenanceActivityHandler(req, res) {
  const result = await createSocietyMaintenanceActivity(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: result.message ?? "Not found" });
    return;
  }
  res.status(201).json(result);
}

export async function updateMaintenanceActivityHandler(req, res) {
  const result = await updateSocietyMaintenanceActivity(
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
    res.status(404).json({ error: "Maintenance activity not found" });
    return;
  }
  if (result.error === "invalid_transition") {
    res.status(409).json({ error: "Invalid status transition" });
    return;
  }
  res.json(result);
}
