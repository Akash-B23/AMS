import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { withDbContext } from "../db/context.js";
import { findSocietyById, findSocietyBySlug } from "../db/queries/societies.js";
import {
  findPlatformUserByEmail,
  findUserByEmailAndSociety,
  findUserById,
  findUserPublicById,
  toPublic,
} from "../db/queries/users.js";
import { isPlatformRole, isUserRole } from "../types/roles.js";

const societyLoginSchema = z.object({
  societySlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export function signToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    societyId: user.societyId ?? null,
    societySlug: user.societySlug ?? null,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "sub" in decoded &&
      "email" in decoded &&
      "role" in decoded &&
      typeof decoded.sub === "string" &&
      typeof decoded.email === "string" &&
      typeof decoded.role === "string" &&
      isUserRole(decoded.role)
    ) {
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        societyId:
          typeof decoded.societyId === "string" ? decoded.societyId : null,
        societySlug:
          typeof decoded.societySlug === "string" ? decoded.societySlug : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function toAuthUser(user, society) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    residentId: user.residentId,
    societyId: society?.id ?? null,
    societySlug: society?.slug ?? null,
    societyName: society?.name ?? null,
  };
}

export async function loginWithSociety(societySlug, email, password) {
  const parsed = societyLoginSchema.safeParse({ societySlug, email, password });
  if (!parsed.success) {
    return null;
  }

  const society = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => findSocietyBySlug(tx, parsed.data.societySlug),
  );

  if (!society || !society.isActive) {
    return null;
  }

  const user = await withDbContext(
    { societyId: society.id },
    async (tx) =>
      findUserByEmailAndSociety(tx, parsed.data.email, society.id),
  );

  if (!user || !user.isActive) {
    return null;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return toAuthUser(user, society);
}

export async function loginPlatform(email, password) {
  const parsed = platformLoginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return null;
  }

  const user = await withDbContext(
    { isPlatformSuperadmin: true },
    async (tx) => findPlatformUserByEmail(tx, parsed.data.email),
  );

  if (!user || !user.isActive || !isPlatformRole(user.role)) {
    return null;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return toAuthUser(user, null);
}

export async function getCurrentUser(userId, { societyId, isPlatformSuperadmin }) {
  if (isPlatformSuperadmin) {
    return withDbContext({ isPlatformSuperadmin: true }, async (tx) => {
      const user = await findUserById(tx, userId);
      if (!user?.isActive) {
        return null;
      }
      return toPublic(user, null);
    });
  }

  if (!societyId) {
    return null;
  }

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user?.isActive) {
      return null;
    }
    const society = await findSocietyById(tx, societyId);
    if (!society?.isActive) {
      return null;
    }
    return findUserPublicById(tx, userId, society);
  });
}

export const AUTH_COOKIE_NAME = "ams_token";

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}
