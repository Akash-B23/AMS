import { isPlatformRole } from "../types/roles.js";

export function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireSociety(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isPlatformRole(req.user.role) || !req.user.societyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
