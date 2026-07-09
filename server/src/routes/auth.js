import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  platformLoginHandler,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", loginHandler);
router.post("/platform/login", platformLoginHandler);
router.post("/logout", logoutHandler);
router.get("/me", requireAuth, meHandler);

export default router;
