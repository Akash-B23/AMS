import { z } from "zod";

export const RESERVED_SLUGS = new Set([
  "platform",
  "api",
  "signup",
  "setup",
  "unauthorized",
  "login",
  "auth",
  "health",
]);

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(100, "Slug must be at most 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens only",
  )
  .refine((slug) => !RESERVED_SLUGS.has(slug), "This slug is reserved");

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}
