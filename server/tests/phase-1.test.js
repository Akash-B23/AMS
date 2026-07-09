/**
 * Phase 1 — Multi-Tenant Foundations
 *
 * Verifies: society-scoped login, tenant isolation via RLS, platform superadmin.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:reset -w server && npm run db:migrate -w server && npm run db:seed -w server
 *
 * Run: npm run test:phase-1 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { withDbContext } from "../src/db/context.js";
import { findSocietyBySlug } from "../src/db/queries/societies.js";
import { findUserByEmailAndSociety } from "../src/db/queries/users.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 1 — Multi-Tenant Foundations", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 1 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 1 tests");
    }
    app = createApp();
  });

  test("login with correct societySlug succeeds and returns society context", async () => {
    const res = await request(app).post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.societySlug, GREENVIEW);
    assert.ok(res.body.user.societyId);
    assert.equal(res.body.user.societyName, "Greenview Apartments");
  });

  test("login with wrong societySlug fails for same email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      societySlug: "nonexistent-society",
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });
    assert.equal(res.status, 401);
  });

  test("same email exists in both societies and logs into correct tenant", async () => {
    const greenviewRes = await request(app).post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });
    const sunriseRes = await request(app).post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });
    assert.equal(greenviewRes.status, 200);
    assert.equal(sunriseRes.status, 200);
    assert.notEqual(
      greenviewRes.body.user.societyId,
      sunriseRes.body.user.societyId,
    );
    assert.equal(greenviewRes.body.user.societySlug, GREENVIEW);
    assert.equal(sunriseRes.body.user.societySlug, SUNRISE);
  });

  test("platform superadmin login works without society", async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/platform/login").send({
      email: "superadmin@ams.local",
      password: SEED_PASSWORD,
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, "platform_superadmin");
    assert.equal(loginRes.body.user.societyId, null);
    assert.equal(loginRes.body.user.societySlug, null);

    const meRes = await agent.get("/api/auth/me");
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.role, "platform_superadmin");
    assert.equal(meRes.body.user.societyId, null);
  });

  test("RLS blocks queries without tenant context", async () => {
    const pool = createPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE ams_app");
      const result = await client.query("SELECT id FROM users LIMIT 10");
      assert.equal(result.rows.length, 0);
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await pool.end();
    }
  });

  test("cross-tenant query isolation via withDbContext", async () => {
    const greenview = await withDbContext(
      { isPlatformSuperadmin: true },
      async (tx) => findSocietyBySlug(tx, GREENVIEW),
    );
    const sunrise = await withDbContext(
      { isPlatformSuperadmin: true },
      async (tx) => findSocietyBySlug(tx, SUNRISE),
    );
    assert.ok(greenview);
    assert.ok(sunrise);

    const userInGreenview = await withDbContext(
      { societyId: greenview.id },
      async (tx) =>
        findUserByEmailAndSociety(tx, "resident@ams.local", greenview.id),
    );
    assert.ok(userInGreenview);

    const crossTenantLookup = await withDbContext(
      { societyId: sunrise.id },
      async (tx) =>
        findUserByEmailAndSociety(tx, "resident@ams.local", greenview.id),
    );
    assert.equal(crossTenantLookup, null);
  });

  test("tenant context only sees own society blocks", async () => {
    const greenview = await withDbContext(
      { isPlatformSuperadmin: true },
      async (tx) => findSocietyBySlug(tx, GREENVIEW),
    );
    const sunrise = await withDbContext(
      { isPlatformSuperadmin: true },
      async (tx) => findSocietyBySlug(tx, SUNRISE),
    );

    const greenviewBlocks = await withDbContext(
      { societyId: greenview.id },
      async (client) => {
        const result = await client.query(`SELECT society_id FROM blocks`);
        return result.rows;
      },
    );
    const sunriseBlocks = await withDbContext(
      { societyId: sunrise.id },
      async (client) => {
        const result = await client.query(`SELECT society_id FROM blocks`);
        return result.rows;
      },
    );

    assert.ok(greenviewBlocks.length > 0);
    assert.ok(sunriseBlocks.length > 0);
    assert.ok(
      greenviewBlocks.every((row) => row.society_id === greenview.id),
    );
    assert.ok(sunriseBlocks.every((row) => row.society_id === sunrise.id));
  });
});
