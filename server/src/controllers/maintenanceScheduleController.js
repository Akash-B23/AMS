import {
  createSocietyMaintenanceSchedule,
  getMaintenanceSchedules,
  updateSocietyMaintenanceSchedule,
} from "../services/maintenanceScheduleService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listMaintenanceSchedulesHandler(req, res) {
  const result = await getMaintenanceSchedules(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function createMaintenanceScheduleHandler(req, res) {
  const result = await createSocietyMaintenanceSchedule(
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

export async function updateMaintenanceScheduleHandler(req, res) {
  const result = await updateSocietyMaintenanceSchedule(
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
    res.status(404).json({ error: result.message ?? "Schedule not found" });
    return;
  }
  res.json(result);
}
