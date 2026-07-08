import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  findUserByEmail,
  findUserPublicById,
} from "../db/queries/users.js";
import { isUserRole } from "../types/roles.js";

const loginSchema = z.object({
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
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function login(email, password) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return null;
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !user.isActive) {
    return null;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    residentId: user.residentId,
  };
}

export async function getCurrentUser(userId) {
  const user = await findUserPublicById(userId);
  if (!user) {
    return null;
  }
  const full = await findUserByEmail(user.email);
  if (!full?.isActive) {
    return null;
  }
  return user;
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
