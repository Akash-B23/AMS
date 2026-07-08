import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import routes from "./routes/index.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/errorHandler.js";

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
  app.use(express.json());
  app.use(authenticate);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
