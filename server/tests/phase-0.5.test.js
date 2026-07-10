/**
 * Phase 0.5 — Society Onboarding
 *
 * Verifies: self-service signup, slug checks, setup wizard APIs, tenant isolation.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *
 * Run: npm run test:phase-0.5 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { withPoolBypass } from "../src/db/context.js";

const TEST_SLUG = `test-society-${Date.now()}`;
const TEST_EMAIL = `admin-${Date.now()}@example.com`;
const TEST_PASSWORD = "securepass123";

describe("Phase 0.5 — Society Onboarding", () => {
  /** @type {import('express').Express} */
  let app;
  /** @type {import('supertest').Agent} */
  let agent;
  let societySlug;
  let flatId;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 0.5 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 0.5 tests");
    }
    app = createApp();
    agent = request.agent(app);
  });

  after(async () => {
    if (!societySlug) {
      return;
    }
    const pool = createPool();
    try {
      await withPoolBypass(pool, async (client) => {
        const society = await client.query(
          "SELECT id FROM societies WHERE slug = $1 LIMIT 1",
          [societySlug],
        );
        if (!society.rows[0]) {
          return;
        }
        const societyId = society.rows[0].id;
        await client.query("DELETE FROM users WHERE society_id = $1", [societyId]);
        await client.query("DELETE FROM residents WHERE society_id = $1", [societyId]);
        await client.query("DELETE FROM flats WHERE society_id = $1", [societyId]);
        await client.query("DELETE FROM blocks WHERE society_id = $1", [societyId]);
        await client.query("DELETE FROM societies WHERE id = $1", [societyId]);
      });
    } finally {
      await pool.end();
    }
  });

  test("reserved slug is rejected on check-slug", async () => {
    const res = await request(app).get("/api/onboarding/check-slug?slug=platform");
    assert.equal(res.status, 200);
    assert.equal(res.body.available, false);
  });

  test("available slug returns available true", async () => {
    const res = await request(app).get(
      `/api/onboarding/check-slug?slug=${TEST_SLUG}`,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.available, true);
    assert.equal(res.body.slug, TEST_SLUG);
  });

  test("taken slug returns available false", async () => {
    const res = await request(app).get(
      "/api/onboarding/check-slug?slug=greenview-apartments",
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.available, false);
  });

  test("signup creates society and admin with cookie", async () => {
    const res = await agent.post("/api/onboarding/signup").send({
      societyName: "Test Society",
      slug: TEST_SLUG,
      adminEmail: TEST_EMAIL,
      adminPassword: TEST_PASSWORD,
      adminName: "Test Admin",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.societySlug, TEST_SLUG);
    assert.equal(res.body.user.role, "admin");
    assert.equal(res.body.user.setupComplete, false);
    societySlug = res.body.user.societySlug;

    const me = await agent.get("/api/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, TEST_EMAIL);
    assert.equal(me.body.user.setupComplete, false);
  });

  test("duplicate slug returns 409", async () => {
    const res = await request(app).post("/api/onboarding/signup").send({
      societyName: "Another Society",
      slug: TEST_SLUG,
      adminEmail: "other@example.com",
      adminPassword: TEST_PASSWORD,
    });
    assert.equal(res.status, 409);
  });

  test("reserved slug on signup returns 400", async () => {
    const res = await request(app).post("/api/onboarding/signup").send({
      societyName: "Bad Slug",
      slug: "signup",
      adminEmail: "bad@example.com",
      adminPassword: TEST_PASSWORD,
    });
    assert.equal(res.status, 400);
  });

  test("setup status shows incomplete with zero flats", async () => {
    const res = await agent.get("/api/setup/status");
    assert.equal(res.status, 200);
    assert.equal(res.body.setupComplete, false);
    assert.equal(res.body.flatCount, 0);
  });

  test("flat import creates blocks and flats", async () => {
    const res = await agent.post("/api/setup/flats/import").send({
      rows: [
        { blockName: "Block A", flatNumber: "101", floor: 1 },
        { blockName: "Block A", flatNumber: "102", floor: 1 },
        { blockName: "Block B", flatNumber: "201", floor: 2 },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 3);
    assert.equal(res.body.flats.length, 3);
    flatId = res.body.flats[0].id;
  });

  test("duplicate flat in import is rejected with error", async () => {
    const res = await agent.post("/api/setup/flats/import").send({
      rows: [{ blockName: "Block A", flatNumber: "101", floor: 1 }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 0);
    assert.ok(res.body.errors.length > 0);
  });

  test("complete setup fails without maintenance amounts", async () => {
    const res = await agent.post("/api/setup/complete");
    assert.equal(res.status, 400);
    assert.match(res.body.error, /missing maintenance/i);
  });

  test("maintenance update saves per-flat amounts", async () => {
    const flatsRes = await agent.get("/api/setup/flats");
    const amounts = flatsRes.body.flats.map((flat) => ({
      flatId: flat.id,
      maintenanceAmountPaise: 500000,
    }));
    const res = await agent.put("/api/setup/maintenance").send({ amounts });
    assert.equal(res.status, 200);
    assert.equal(res.body.flats[0].maintenanceAmountPaise, 500000);
  });

  test("complete setup succeeds and is idempotent", async () => {
    const res = await agent.post("/api/setup/complete");
    assert.equal(res.status, 200);
    assert.equal(res.body.setupComplete, true);

    const again = await agent.post("/api/setup/complete");
    assert.equal(again.status, 200);
    assert.equal(again.body.alreadyComplete, true);

    const me = await agent.get("/api/auth/me");
    assert.equal(me.body.user.setupComplete, true);
  });

  test("non-admin cannot access setup routes", async () => {
    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/login").send({
      societySlug: "greenview-apartments",
      email: "manager@ams.local",
      password: "password123",
    });
    const res = await otherAgent.get("/api/setup/status");
    assert.equal(res.status, 403);
  });

  test("tenant isolation: greenview admin cannot import into test society", async () => {
    const greenviewAgent = request.agent(app);
    await greenviewAgent.post("/api/auth/login").send({
      societySlug: "greenview-apartments",
      email: "admin@ams.local",
      password: "password123",
    });
    const res = await greenviewAgent.post("/api/setup/flats/import").send({
      rows: [{ blockName: "Evil Block", flatNumber: "999" }],
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.created >= 0);

    const testFlats = await agent.get("/api/setup/flats");
    const evil = testFlats.body.flats.find((f) => f.flatNumber === "999");
    assert.equal(evil, undefined);
  });

  test("login after setup routes admin to society with setupComplete", async () => {
    const loginAgent = request.agent(app);
    const res = await loginAgent.post("/api/auth/login").send({
      societySlug,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.setupComplete, true);
    assert.equal(res.body.user.societySlug, societySlug);
  });
});
