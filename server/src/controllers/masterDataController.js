import {
  importAmenities,
  importMaintenance,
  importMasterDataFlats,
  listMasterDataAmenities,
  listMasterDataFlats,
  listMasterDataSummary,
} from "../services/masterDataService.js";

export async function summaryHandler(req, res) {
  const summary = await listMasterDataSummary(req.user.societyId);
  res.json(summary);
}

export async function listFlatsHandler(req, res) {
  const flats = await listMasterDataFlats(req.user.societyId);
  res.json({ flats });
}

export async function importFlatsHandler(req, res) {
  const result = await importMasterDataFlats(req.user.societyId, req.body.rows);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  res.json(result);
}

export async function importMaintenanceHandler(req, res) {
  const result = await importMaintenance(req.user.societyId, req.body.rows);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  res.json(result);
}

export async function listAmenitiesHandler(req, res) {
  const amenities = await listMasterDataAmenities(req.user.societyId);
  res.json({ amenities });
}

export async function importAmenitiesHandler(req, res) {
  const result = await importAmenities(req.user.societyId, req.body.rows);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  res.json(result);
}
