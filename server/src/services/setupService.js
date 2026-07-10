import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { getOrCreateBlock, createBlock } from "../db/queries/blocks.js";
import {
  createFlat,
  findFlatByBlockAndNumber,
  listFlatsWithBlocks,
  setMaintenanceAmounts,
} from "../db/queries/flats.js";
import {
  findSocietyById,
  getSetupCounts,
  markSetupComplete,
} from "../db/queries/societies.js";

const flatRowSchema = z.object({
  blockName: z.string().min(1).max(100),
  flatNumber: z.string().min(1).max(20),
  floor: z.number().int().optional().nullable(),
});

const flatImportSchema = z.object({
  rows: z.array(flatRowSchema).min(1),
});

const maintenanceAmountSchema = z.object({
  flatId: z.string().uuid(),
  maintenanceAmountPaise: z.number().int().positive(),
});

const maintenanceUpdateSchema = z.object({
  amounts: z.array(maintenanceAmountSchema).min(1),
});

const blockCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function getSetupStatus(societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const society = await findSocietyById(tx, societyId);
    if (!society) {
      return null;
    }
    const counts = await getSetupCounts(tx, societyId);
    return {
      setupComplete: society.setupCompletedAt != null,
      ...counts,
    };
  });
}

export async function createSetupBlock(societyId, name) {
  const parsed = blockCreateSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  try {
    const block = await withDbContext({ societyId }, async (tx) =>
      createBlock(tx, societyId, parsed.data.name),
    );
    return { block };
  } catch (err) {
    if (err.code === "23505") {
      return { error: "duplicate_block" };
    }
    throw err;
  }
}

export async function importFlats(societyId, rows) {
  const parsed = flatImportSchema.safeParse({ rows });
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
      const key = `${row.blockName}::${row.flatNumber}`;

      if (seenInBatch.has(key)) {
        errors.push({ row: rowNum, message: "Duplicate row in import batch" });
        continue;
      }
      seenInBatch.add(key);

      const block = await getOrCreateBlock(tx, societyId, row.blockName);
      const existing = await findFlatByBlockAndNumber(
        tx,
        block.id,
        row.flatNumber,
      );
      if (existing) {
        errors.push({
          row: rowNum,
          message: `Flat ${row.flatNumber} already exists in ${row.blockName}`,
        });
        skipped++;
        continue;
      }

      await createFlat(tx, {
        societyId,
        blockId: block.id,
        flatNumber: row.flatNumber,
        floor: row.floor ?? null,
      });
      created++;
    }

    const flats = await listFlatsWithBlocks(tx, societyId);
    return { created, skipped, errors, flats };
  });
}

export async function updateMaintenanceAmounts(societyId, amounts) {
  const parsed = maintenanceUpdateSchema.safeParse({ amounts });
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const flats = await listFlatsWithBlocks(tx, societyId);
    const flatIds = new Set(flats.map((f) => f.id));

    for (const amount of parsed.data.amounts) {
      if (!flatIds.has(amount.flatId)) {
        return { error: "invalid_flat" };
      }
    }

    await setMaintenanceAmounts(tx, societyId, parsed.data.amounts);
    const updated = await listFlatsWithBlocks(tx, societyId);
    return { flats: updated };
  });
}

export async function completeSetup(societyId) {
  return withDbContext({ societyId }, async (tx) => {
    const society = await findSocietyById(tx, societyId);
    if (!society) {
      return { error: "not_found" };
    }

    if (society.setupCompletedAt) {
      return { alreadyComplete: true, society };
    }

    const counts = await getSetupCounts(tx, societyId);
    if (counts.blockCount < 1) {
      return { error: "no_blocks" };
    }
    if (counts.flatCount < 1) {
      return { error: "no_flats" };
    }
    if (counts.flatsMissingMaintenance > 0) {
      return { error: "missing_maintenance", count: counts.flatsMissingMaintenance };
    }

    const updated = await markSetupComplete(tx, societyId);
    return { society: updated };
  });
}

/**
 * Seed helper: create block and flats for a society (platform bypass context).
 */
export async function seedBlockAndFlats(client, societyId, blockName, flatNumbers) {
  const block = await getOrCreateBlock(client, societyId, blockName);
  const flatIds = new Map();

  for (const flatNumber of flatNumbers) {
    const existing = await findFlatByBlockAndNumber(client, block.id, flatNumber);
    if (existing) {
      flatIds.set(flatNumber, existing.id);
      continue;
    }
    const flat = await createFlat(client, {
      societyId,
      blockId: block.id,
      flatNumber,
      floor: 1,
    });
    flatIds.set(flatNumber, flat.id);
  }

  return { blockId: block.id, flatIds };
}

export async function listSetupFlats(societyId) {
  return withDbContext({ societyId }, async (tx) =>
    listFlatsWithBlocks(tx, societyId),
  );
}
