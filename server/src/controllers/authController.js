import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  getClearCookieOptions,
  getCookieOptions,
  getCurrentUser,
  loginPlatform,
  loginWithSociety,
  signToken,
} from "../services/authService.js";

const societyLoginBodySchema = z.object({
  societySlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

const platformLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginHandler(req, res) {
  const parsed = societyLoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const user = await loginWithSociety(
    parsed.data.societySlug,
    parsed.data.email,
    parsed.data.password,
  );
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
  res.json({ user });
}

export async function platformLoginHandler(req, res) {
  const parsed = platformLoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const user = await loginPlatform(parsed.data.email, parsed.data.password);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
  res.json({ user });
}

export function logoutHandler(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
  res.json({ ok: true });
}

export async function meHandler(req, res) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getCurrentUser(req.user.id, {
    societyId: req.user.societyId,
    isPlatformSuperadmin: req.user.role === "platform_superadmin",
  });
  if (!user) {
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ user });
}
