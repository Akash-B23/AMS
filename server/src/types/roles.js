export const USER_ROLES = [
  "resident",
  "tenant",
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];

export const RESIDENT_ROLES = ["resident", "tenant"];

export const STAFF_ROLES = [
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];

export function isUserRole(value) {
  return USER_ROLES.includes(value);
}
