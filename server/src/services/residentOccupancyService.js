import bcrypt from "bcryptjs";
import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import { findFlatById } from "../db/queries/flats.js";
import {
  createResident,
  deactivateResident,
  findActiveResidentOfType,
  findResidentById,
  getPendingDuesForFlat,
  listResidents,
} from "../db/queries/residents.js";
import {
  createUser,
  deactivateUserByResidentId,
  findUserByEmailAndSociety,
} from "../db/queries/users.js";

const listQuerySchema = z.object({
  blockId: z.string().uuid().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? true : v === "true")),
});

const moveInSchema = z.object({
  flatId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(255),
  residentType: z.enum(["owner", "tenant"]),
  password: z.string().min(8).max(128),
});

const moveOutSchema = z.object({
  confirmDespiteDues: z.boolean().optional().default(false),
});

function roleForResidentType(residentType) {
  return residentType === "tenant" ? "tenant" : "resident";
}

export async function getSocietyResidents(societyId, query) {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const residents = await listResidents(tx, societyId, {
      blockId: parsed.data.blockId ?? null,
      activeOnly: parsed.data.active,
    });
    return { residents };
  });
}

export async function moveInResident(societyId, actorUserId, body) {
  const parsed = moveInSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const email = parsed.data.email.toLowerCase();
  const phone =
    parsed.data.phone === "" || parsed.data.phone == null
      ? null
      : parsed.data.phone;

  try {
    return await withDbContext({ societyId }, async (tx) => {
      const flat = await findFlatById(tx, societyId, parsed.data.flatId);
      if (!flat || !flat.isActive) {
        return { error: "flat_not_found" };
      }

      const existingOfType = await findActiveResidentOfType(
        tx,
        societyId,
        flat.id,
        parsed.data.residentType,
      );
      if (existingOfType) {
        return {
          error: "type_occupied",
          message: `This flat already has an active ${parsed.data.residentType}`,
        };
      }

      const existingUser = await findUserByEmailAndSociety(tx, email, societyId);
      if (existingUser) {
        return { error: "email_taken" };
      }

      const resident = await createResident(tx, {
        societyId,
        flatId: flat.id,
        name: parsed.data.name,
        phone,
        email,
        residentType: parsed.data.residentType,
      });

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const user = await createUser(tx, {
        societyId,
        email,
        passwordHash,
        role: roleForResidentType(parsed.data.residentType),
        displayName: parsed.data.name,
        residentId: resident.id,
      });

      await createAuditLog(tx, {
        societyId,
        actorUserId,
        action: "resident.move_in",
        entityType: "resident",
        entityId: resident.id,
        meta: {
          flatId: flat.id,
          residentType: resident.residentType,
          userId: user.id,
          email,
        },
      });

      return {
        resident: {
          ...resident,
          flatNumber: flat.flatNumber,
          blockName: flat.blockName,
          blockId: flat.blockId,
          hasLogin: true,
          userEmail: user.email,
        },
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    });
  } catch (err) {
    if (err.code === "23505") {
      return {
        error: "type_occupied",
        message: "This flat already has an active resident of that type",
      };
    }
    throw err;
  }
}

export async function moveOutResident(
  societyId,
  actorUserId,
  residentId,
  body,
) {
  const parsed = moveOutSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  return withDbContext({ societyId }, async (tx) => {
    const resident = await findResidentById(tx, residentId);
    if (!resident || resident.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (!resident.isActive) {
      return { error: "already_inactive" };
    }

    const dues = await getPendingDuesForFlat(tx, societyId, resident.flatId);
    if (dues.pendingInvoiceCount > 0 && !parsed.data.confirmDespiteDues) {
      return {
        error: "pending_dues",
        ...dues,
      };
    }

    const deactivated = await deactivateResident(tx, resident.id);
    if (!deactivated) {
      return { error: "already_inactive" };
    }

    const deactivatedUsers = await deactivateUserByResidentId(
      tx,
      societyId,
      resident.id,
    );

    await createAuditLog(tx, {
      societyId,
      actorUserId,
      action: "resident.move_out",
      entityType: "resident",
      entityId: resident.id,
      meta: {
        flatId: resident.flatId,
        pendingInvoiceCount: dues.pendingInvoiceCount,
        pendingAmountPaise: dues.pendingAmountPaise,
        deactivatedUserIds: deactivatedUsers.map((u) => u.id),
        confirmedDespiteDues: parsed.data.confirmDespiteDues,
      },
    });

    return {
      resident: deactivated,
      ...dues,
    };
  });
}
