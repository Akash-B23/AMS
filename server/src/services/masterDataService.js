import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { countAmenities, createAmenity, findAmenityByName, listAmenities } from "../db/queries/amenities.js";
import { findFlatByBlockNameAndNumber, listFlatsWithBlocks, setMaintenanceAmounts } from "../db/queries/flats.js";
import { getSetupCounts } from "../db/queries/societies.js";
import { importFlats as setupImportFlats, listSetupFlats } from "./setupService.js";

const maintenanceRowSchema = z.object({
  blockName: z.string().min(1).max(100),
  flatNumber: z.string().min(1).max(20),
  maintenanceAmountRupees: z.number().positive(),
});

const maintenanceImportSchema = z.object({
  rows: z.array(maintenanceRowSchema).min(1),
});

const amenityRowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

const amenityImportSchema = z.object({
  rows: z.array(amenityRowSchema).min(1),
});

export async function listMasterDataSummary(societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const counts = await getSetupCounts(tx, societyId);
    const amenityCount = await countAmenities(tx, societyId);
    return {
      ...counts,
      amenityCount,
    };
  });
}

export async function listMasterDataFlats(societyId) {
  return listSetupFlats(societyId);
}

export async function importMasterDataFlats(societyId, rows) {
  return setupImportFlats(societyId, rows);
}

export async function importMaintenance(societyId, rows) {
  const parsed = maintenanceImportSchema.safeParse({ rows });
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const errors = [];
  const seenInBatch = new Set();

  return withDbContext({ societyId }, async (tx) => {
    let updated = 0;
    let skipped = 0;
    const amounts = [];

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      const rowNum = i + 1;
      const key = `${row.blockName}::${row.flatNumber}`;

      if (seenInBatch.has(key)) {
        errors.push({ row: rowNum, message: "Duplicate row in import batch" });
        continue;
      }
      seenInBatch.add(key);

      const flat = await findFlatByBlockNameAndNumber(
        tx,
        societyId,
        row.blockName,
        row.flatNumber,
      );
      if (!flat) {
        errors.push({
          row: rowNum,
          message: `Flat ${row.flatNumber} not found in ${row.blockName}`,
        });
        skipped++;
        continue;
      }

      const maintenanceAmountPaise = Math.round(row.maintenanceAmountRupees * 100);
      amounts.push({ flatId: flat.id, maintenanceAmountPaise });
      updated++;
    }

    if (amounts.length > 0) {
      await setMaintenanceAmounts(tx, societyId, amounts);
    }

    const flats = await listFlatsWithBlocks(tx, societyId);
    return { updated, skipped, errors, flats };
  });
}

export async function listMasterDataAmenities(societyId) {
  return withDbContext({ societyId }, async (tx) => listAmenities(tx, societyId));
}

export async function importAmenities(societyId, rows) {
  const parsed = amenityImportSchema.safeParse({ rows });
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const errors = [];
  const seenInBatch = new Set();

  return withDbContext({ societyId }, async (tx) => {
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      const rowNum = i + 1;
      const key = row.name.toLowerCase();

      if (seenInBatch.has(key)) {
        errors.push({ row: rowNum, message: "Duplicate row in import batch" });
        continue;
      }
      seenInBatch.add(key);

      const existing = await findAmenityByName(tx, societyId, row.name);
      if (existing) {
        errors.push({
          row: rowNum,
          message: `Amenity "${row.name}" already exists`,
        });
        skipped++;
        continue;
      }

      await createAmenity(tx, societyId, {
        name: row.name,
        description: row.description ?? null,
      });
      created++;
    }

    const amenities = await listAmenities(tx, societyId);
    return { created, skipped, errors, amenities };
  });
}
