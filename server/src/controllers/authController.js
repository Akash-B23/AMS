import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  getCurrentUser,
  login,
  signToken,
} from "../services/authService.js";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginHandler(req, res) {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const user = await login(parsed.data.email, parsed.data.password);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
  res.json({ user });
}

export function logoutHandler(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ ok: true });
}

export async function meHandler(req, res) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getCurrentUser(req.user.id);
  if (!user) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ user });
}
