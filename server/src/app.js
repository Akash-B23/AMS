import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import routes from "./routes/index.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { cashfreeWebhookHandler } from "./controllers/jobsController.js";

export function createApp() {
  const app = express();
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    }),
  );
  app.use(cookieParser());

  // Raw body required for Cashfree signature verification — before JSON parser.
  app.post(
    "/api/webhooks/cashfree",
    express.raw({ type: "application/json" }),
    cashfreeWebhookHandler,
  );

  app.use(express.json());
  app.use(authenticate);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
