import {
  AUTH_COOKIE_NAME,
  verifyToken,
} from "../services/authService.js";
import { isUserRole } from "../types/roles.js";

export function authenticate(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    next();
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !isUserRole(payload.role)) {
    next();
    return;
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
  next();
}
