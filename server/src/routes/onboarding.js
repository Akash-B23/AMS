import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  checkSlugHandler,
  signupHandler,
} from "../controllers/onboardingController.js";

const router = Router();

const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

router.get("/check-slug", onboardingLimiter, checkSlugHandler);
router.post("/signup", onboardingLimiter, signupHandler);

export default router;
