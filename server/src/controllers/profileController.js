import {
  addMyVehicle,
  getMyProfile,
  removeMyVehicle,
  updateMyContact,
  updateMyVehicle,
} from "../services/profileService.js";

export async function getProfileHandler(req, res) {
  const result = await getMyProfile(req.user.id, req.user.societyId);
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  res.json(result);
}

export async function updateProfileHandler(req, res) {
  const result = await updateMyContact(req.user.id, req.user.societyId, req.body);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  res.json(result);
}

export async function addVehicleHandler(req, res) {
  const result = await addMyVehicle(req.user.id, req.user.societyId, req.body);
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  if (result.error === "vehicle_limit") {
    res.status(400).json({ error: `Maximum ${result.limit} vehicles allowed` });
    return;
  }
  if (result.error === "duplicate_registration") {
    res.status(409).json({ error: "A vehicle with this registration number already exists" });
    return;
  }
  res.status(201).json(result);
}

export async function updateVehicleHandler(req, res) {
  const result = await updateMyVehicle(
    req.user.id,
    req.user.societyId,
    req.params.id,
    req.body,
  );
  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  if (result.error === "duplicate_registration") {
    res.status(409).json({ error: "A vehicle with this registration number already exists" });
    return;
  }
  res.json(result);
}

export async function deleteVehicleHandler(req, res) {
  const result = await removeMyVehicle(
    req.user.id,
    req.user.societyId,
    req.params.id,
  );
  if (result.error === "no_resident_profile") {
    res.status(404).json({ error: "Resident profile not found" });
    return;
  }
  if (result.error === "not_found") {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(result);
}
