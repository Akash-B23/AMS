import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  signToken,
} from "../services/authService.js";
import { checkSlugAvailability, signupSociety } from "../services/onboardingService.js";

export async function checkSlugHandler(req, res) {
  const slug = req.query.slug;
  if (!slug || typeof slug !== "string") {
    res.status(400).json({ error: "slug query parameter is required" });
    return;
  }

  const result = await checkSlugAvailability(slug);
  res.json(result);
}

export async function signupHandler(req, res) {
  const result = await signupSociety(req.body);

  if (result.error === "validation") {
    const message = result.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }

  if (result.error === "slug_taken") {
    res.status(409).json({ error: "This slug is already taken" });
    return;
  }

  const token = signToken(result.user);
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
  res.status(201).json({ user: result.user });
}
