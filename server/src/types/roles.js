export const USER_ROLES = [
  "resident",
  "tenant",
  "manager",
  "admin",
  "association_staff",
  "treasurer",
  "platform_superadmin",
];

export const RESIDENT_ROLES = ["resident", "tenant"];

export const SOCIETY_STAFF_ROLES = [
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];

export const STAFF_ROLES = SOCIETY_STAFF_ROLES;

export const PLATFORM_ROLES = ["platform_superadmin"];

export function isUserRole(value) {
  return USER_ROLES.includes(value);
}

export function isPlatformRole(value) {
  return PLATFORM_ROLES.includes(value);
}
