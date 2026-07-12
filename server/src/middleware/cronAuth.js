/**
 * Accept either Bearer CRON_SECRET or (when allowStaff) leave auth to route stack.
 * Sets req.cronAuthenticated when the cron secret matched.
 */
export function requireCronOrFinanceStaff({ allowStaff = false } = {}) {
  return (req, res, next) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    if (secret && auth === `Bearer ${secret}`) {
      req.cronAuthenticated = true;
      next();
      return;
    }

    if (allowStaff) {
      // Defer to subsequent middleware for staff auth.
      req.cronAuthenticated = false;
      next();
      return;
    }

    res.status(401).json({ error: "Unauthorized" });
  };
}

export function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
