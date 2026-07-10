import bcrypt from "bcryptjs";
import { z } from "zod";
import { withDbContext } from "../db/context.js";
import {
  createSociety,
  findSocietyBySlug,
  isSlugAvailable,
} from "../db/queries/societies.js";
import { createUser } from "../db/queries/users.js";
import { slugSchema } from "../utils/slug.js";
import { slugify } from "../utils/slugify.js";

const signupSchema = z.object({
  societyName: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(1).max(200).optional(),
});

function toAuthUser(user, society) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    residentId: user.residentId,
    societyId: society.id,
    societySlug: society.slug,
    societyName: society.name,
    setupComplete: society.setupCompletedAt != null,
  };
}

export async function checkSlugAvailability(slug) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message ?? "Invalid slug" };
  }

  const available = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => isSlugAvailable(tx, parsed.data),
  );

  return { available, slug: parsed.data };
}

export async function signupSociety(input) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const slug = parsed.data.slug ?? slugify(parsed.data.societyName);
  const slugCheck = slugSchema.safeParse(slug);
  if (!slugCheck.success) {
    return { error: "validation", issues: slugCheck.error.issues };
  }

  try {
    const result = await withDbContext(
      { isPlatformSuperadmin: true },
      async (tx) => {
        const taken = !(await isSlugAvailable(tx, slugCheck.data));
        if (taken) {
          return { error: "slug_taken" };
        }

        const society = await createSociety(tx, {
          name: parsed.data.societyName,
          slug: slugCheck.data,
        });

        const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 10);
        const user = await createUser(tx, {
          societyId: society.id,
          email: parsed.data.adminEmail,
          passwordHash,
          role: "admin",
          displayName: parsed.data.adminName ?? null,
        });

        return { user: toAuthUser(user, society), society };
      },
    );

    return result;
  } catch (err) {
    if (err.code === "23505") {
      return { error: "slug_taken" };
    }
    throw err;
  }
}

export async function getSocietyBySlug(slug) {
  return withDbContext({ isPlatformSuperadmin: true }, async (tx) =>
    findSocietyBySlug(tx, slug),
  );
}
