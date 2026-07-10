import {
  completeSetup,
  createSetupBlock,
  getSetupStatus,
  importFlats,
  listSetupFlats,
  updateMaintenanceAmounts,
} from "../services/setupService.js";

export async function statusHandler(req, res) {
  const status = await getSetupStatus(req.user.societyId);
  if (!status) {
    res.status(404).json({ error: "Society not found" });
    return;
  }
  res.json(status);
}

export async function listFlatsHandler(req, res) {
  const flats = await listSetupFlats(req.user.societyId);
  res.json({ flats });
}

export async function createBlockHandler(req, res) {
  const result = await createSetupBlock(req.user.societyId, req.body.name);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  if (result.error === "duplicate_block") {
    res.status(409).json({ error: "A block with this name already exists" });
    return;
  }
  res.status(201).json({ block: result.block });
}

export async function importFlatsHandler(req, res) {
  const result = await importFlats(req.user.societyId, req.body.rows);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  res.json(result);
}

export async function maintenanceHandler(req, res) {
  const result = await updateMaintenanceAmounts(
    req.user.societyId,
    req.body.amounts,
  );
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  if (result.error === "invalid_flat") {
    res.status(400).json({ error: "One or more flats do not belong to this society" });
    return;
  }
  res.json({ flats: result.flats });
}

export async function completeHandler(req, res) {
  const result = await completeSetup(req.user.societyId);
  if (result.error === "not_found") {
    res.status(404).json({ error: "Society not found" });
    return;
  }
  if (result.error === "no_blocks") {
    res.status(400).json({ error: "Add at least one block before completing setup" });
    return;
  }
  if (result.error === "no_flats") {
    res.status(400).json({ error: "Add at least one flat before completing setup" });
    return;
  }
  if (result.error === "missing_maintenance") {
    res.status(400).json({
      error: `${result.count} flat(s) are missing maintenance amounts`,
    });
    return;
  }
  res.json({
    ok: true,
    alreadyComplete: result.alreadyComplete ?? false,
    setupComplete: true,
  });
}
