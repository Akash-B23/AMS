/**
 * Phase 0 — Foundations
 *
 * Verifies: health check, login/logout, JWT cookie session, /me, role in token.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-0 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { RESIDENT_ROLES, STAFF_ROLES } from "../src/types/roles.js";

const SEED_PASSWORD = "password123";

describe("Phase 0 — Foundations", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 0 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 0 tests");
    }
    app = createApp();
  });

  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  });

  test("GET /api/auth/me without cookie returns 401", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Unauthorized");
  });

  test("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "resident@ams.local", password: "wrong-password" });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Invalid email or password");
  });

  test("POST /api/auth/login rejects invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" });
    assert.equal(res.status, 400);
  });

  test("resident login sets cookie and /me returns user", async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: "resident@ams.local", password: SEED_PASSWORD });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.email, "resident@ams.local");
    assert.equal(loginRes.body.user.role, "resident");
    assert.ok(loginRes.body.user.id);

    const meRes = await agent.get("/api/auth/me");
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, "resident@ams.local");
    assert.equal(meRes.body.user.role, "resident");
  });

  test("manager login returns staff role", async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: "manager@ams.local", password: SEED_PASSWORD });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, "manager");
    assert.ok(STAFF_ROLES.includes(loginRes.body.user.role));
  });

  test("tenant login returns resident role group", async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: "tenant@ams.local", password: SEED_PASSWORD });
    assert.equal(loginRes.status, 200);
    assert.ok(RESIDENT_ROLES.includes(loginRes.body.user.role));
  });

  test("logout clears session", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({ email: "admin@ams.local", password: SEED_PASSWORD });

    const logoutRes = await agent.post("/api/auth/logout");
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.ok, true);

    const meRes = await agent.get("/api/auth/me");
    assert.equal(meRes.status, 401);
  });

  test("all seed roles can log in", async () => {
    const emails = [
      "resident@ams.local",
      "tenant@ams.local",
      "manager@ams.local",
      "admin@ams.local",
      "staff@ams.local",
      "treasurer@ams.local",
    ];

    for (const email of emails) {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email, password: SEED_PASSWORD });
      assert.equal(res.status, 200, `login failed for ${email}`);
      assert.equal(res.body.user.email, email);
    }
  });
});
