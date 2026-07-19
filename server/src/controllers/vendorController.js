import {
  createSocietyVendor,
  getVendors,
  updateSocietyVendor,
} from "../services/vendorService.js";

function validationError(res, result) {
  const message = result.issues?.[0]?.message ?? "Invalid input";
  res.status(400).json({ error: message });
}

export async function listVendorsHandler(req, res) {
  const result = await getVendors(req.user.societyId, req.query);
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.json(result);
}

export async function createVendorHandler(req, res) {
  const result = await createSocietyVendor(
    req.user.societyId,
    req.user.id,
    req.body,
  );
  if (result.error === "validation") {
    validationError(res, result);
    return;
  }
  res.status(201).json(result);
}

export async function updateVendorHandler(req, res) {
  const result = await updateSocietyVendor(
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
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(result);
}
