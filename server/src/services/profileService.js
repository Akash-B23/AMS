import { z } from "zod";
import { withDbContext } from "../db/context.js";
import {
  findResidentWithFlat,
  updateResidentContact,
} from "../db/queries/residents.js";
import { findUserById, updateDisplayName } from "../db/queries/users.js";
import {
  countVehiclesByResident,
  createVehicle,
  findByRegistration,
  findVehicleById,
  listVehiclesByResident,
  softDeleteVehicle,
  updateVehicle,
} from "../db/queries/vehicles.js";

const MAX_VEHICLES_PER_RESIDENT = 3;

const contactUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().nullable(),
});

const vehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(20),
  vehicleType: z.enum(["car", "bike", "other"]),
  makeModel: z.string().max(100).optional().nullable(),
  parkingSlot: z.string().max(50).optional().nullable(),
});

function toProfileResponse(user, resident, vehicles) {
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    resident: {
      id: resident.id,
      name: resident.name,
      phone: resident.phone,
      email: resident.email,
      residentType: resident.residentType,
      flat: {
        id: resident.flatId,
        flatNumber: resident.flatNumber,
        blockName: resident.blockName,
        floor: resident.floor,
      },
    },
    vehicles,
  };
}

export async function getMyProfile(userId, societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const resident = await findResidentWithFlat(tx, user.residentId);
    if (!resident) {
      return { error: "no_resident_profile" };
    }

    const vehicles = await listVehiclesByResident(tx, user.residentId);
    return toProfileResponse(user, resident, vehicles);
  });
}

export async function updateMyContact(userId, societyId, data) {
  const parsed = contactUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const resident = await updateResidentContact(tx, user.residentId, {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
    });
    if (!resident) {
      return { error: "no_resident_profile" };
    }

    await updateDisplayName(tx, userId, parsed.data.name);
    const updatedUser = await findUserById(tx, userId);
    const residentWithFlat = await findResidentWithFlat(tx, user.residentId);
    const vehicles = await listVehiclesByResident(tx, user.residentId);

    return toProfileResponse(updatedUser, residentWithFlat, vehicles);
  });
}

export async function addMyVehicle(userId, societyId, data) {
  const parsed = vehicleSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const count = await countVehiclesByResident(tx, user.residentId);
    if (count >= MAX_VEHICLES_PER_RESIDENT) {
      return { error: "vehicle_limit", limit: MAX_VEHICLES_PER_RESIDENT };
    }

    const existing = await findByRegistration(
      tx,
      societyId,
      parsed.data.registrationNumber,
    );
    if (existing) {
      return { error: "duplicate_registration" };
    }

    const vehicle = await createVehicle(tx, societyId, user.residentId, {
      registrationNumber: parsed.data.registrationNumber,
      vehicleType: parsed.data.vehicleType,
      makeModel: parsed.data.makeModel ?? null,
      parkingSlot: parsed.data.parkingSlot ?? null,
    });

    return { vehicle };
  });
}

export async function updateMyVehicle(userId, societyId, vehicleId, data) {
  const parsed = vehicleSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const existing = await findVehicleById(tx, vehicleId);
    if (!existing || existing.residentId !== user.residentId) {
      return { error: "not_found" };
    }

    const duplicate = await findByRegistration(
      tx,
      societyId,
      parsed.data.registrationNumber,
    );
    if (duplicate && duplicate.id !== vehicleId) {
      return { error: "duplicate_registration" };
    }

    const vehicle = await updateVehicle(tx, vehicleId, user.residentId, {
      registrationNumber: parsed.data.registrationNumber,
      vehicleType: parsed.data.vehicleType,
      makeModel: parsed.data.makeModel ?? null,
      parkingSlot: parsed.data.parkingSlot ?? null,
    });

    if (!vehicle) {
      return { error: "not_found" };
    }

    return { vehicle };
  });
}

export async function removeMyVehicle(userId, societyId, vehicleId) {
  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const existing = await findVehicleById(tx, vehicleId);
    if (!existing || existing.residentId !== user.residentId) {
      return { error: "not_found" };
    }

    await softDeleteVehicle(tx, vehicleId, user.residentId);
    return { ok: true };
  });
}
