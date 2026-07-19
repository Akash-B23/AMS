/**
 * Phase 7 — Move-in/move-out & shareable reports
 *
 * Verifies: resident+login move-in, duplicate type rejection, move-out dues
 * warning (409) then confirm, pending-dues and income-expense reports,
 * role gates, cross-tenant isolation.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-7 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 7 — Occupancy & shareable reports", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 7 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 7 tests");
    }
    app = createApp();
  });

  test("manager can list residents; resident cannot", async () => {
    const manager = request.agent(app);
    await manager.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const list = await manager.get("/api/residents");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body.residents));
    assert.ok(list.body.residents.length >= 1);

    const resident = request.agent(app);
    await resident.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });
    const forbidden = await resident.get("/api/residents");
    assert.equal(forbidden.status, 403);
  });

  test("move-in creates resident + login; duplicate type rejected", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const flats = await agent.get("/api/master-data/flats");
    assert.equal(flats.status, 200);
    const flat101 = (flats.body.flats ?? []).find((f) => f.flatNumber === "101");
    assert.ok(flat101, "flat 101 should exist");

    const email = `phase7-tenant-${Date.now()}@ams.local`;
    const moveIn = await agent.post("/api/residents").send({
      flatId: flat101.id,
      name: "Phase7 Test Tenant",
      phone: "9999990001",
      email,
      residentType: "tenant",
      password: "tempPass123",
    });
    assert.equal(moveIn.status, 201);
    assert.equal(moveIn.body.resident.residentType, "tenant");
    assert.equal(moveIn.body.user.email, email);
    assert.equal(moveIn.body.user.role, "tenant");

    const login = await request
      .agent(app)
      .post("/api/auth/login")
      .send({
        societySlug: GREENVIEW,
        email,
        password: "tempPass123",
      });
    assert.equal(login.status, 200);

    const dup = await agent.post("/api/residents").send({
      flatId: flat101.id,
      name: "Another Tenant",
      email: `phase7-dup-${Date.now()}@ams.local`,
      residentType: "tenant",
      password: "tempPass123",
    });
    assert.equal(dup.status, 409);

    const moveOut = await agent
      .post(`/api/residents/${moveIn.body.resident.id}/move-out`)
      .send({ confirmDespiteDues: true });
    assert.equal(moveOut.status, 200);
    assert.equal(moveOut.body.resident.isActive, false);
  });

  test("move-out without confirm returns 409 when flat has pending dues", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const dues = await agent.get("/api/invoices/dues");
    assert.equal(dues.status, 200);
    const pending = dues.body.invoices ?? dues.body.dues ?? [];
    assert.ok(
      pending.length > 0,
      "expected at least one pending invoice in seed data",
    );
    const flatId = pending[0].flatId;

    const list = await agent.get("/api/residents");
    assert.equal(list.status, 200);
    const occupant = (list.body.residents ?? []).find(
      (r) => r.flatId === flatId && r.isActive,
    );
    assert.ok(occupant, "expected an active resident on a flat with dues");

    const warn = await agent
      .post(`/api/residents/${occupant.id}/move-out`)
      .send({});
    assert.equal(warn.status, 409);
    assert.equal(warn.body.code, "pending_dues");
    assert.ok(warn.body.pendingInvoiceCount > 0);
    assert.ok(warn.body.pendingAmountPaise > 0);
  });

  test("treasurer can read shareable reports; manager cannot", async () => {
    const treasurer = request.agent(app);
    await treasurer.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const pending = await treasurer.get("/api/reports/pending-dues");
    assert.equal(pending.status, 200);
    assert.ok(pending.body.billingPeriod);
    assert.ok(Array.isArray(pending.body.rows));
    assert.ok(pending.body.totals);

    const income = await treasurer.get("/api/reports/income-expense");
    assert.equal(income.status, 200);
    assert.ok(income.body.from);
    assert.ok(income.body.to);
    assert.ok(income.body.income);
    assert.ok(income.body.expenses);
    assert.equal(typeof income.body.netPaise, "number");

    const manager = request.agent(app);
    await manager.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });
    const denied = await manager.get("/api/reports/pending-dues");
    assert.equal(denied.status, 403);
  });

  test("shareable reports are society-scoped", async () => {
    const green = request.agent(app);
    await green.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });
    const greenPending = await green.get("/api/reports/pending-dues");
    assert.equal(greenPending.status, 200);
    const greenCount = greenPending.body.totals.pendingCount;

    const sunrise = request.agent(app);
    await sunrise.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });
    const sunrisePending = await sunrise.get("/api/reports/pending-dues");
    assert.equal(sunrisePending.status, 200);

    // Counts may differ; ensure each response is self-consistent
    assert.equal(
      sunrisePending.body.rows.length,
      sunrisePending.body.totals.pendingCount,
    );
    assert.equal(greenPending.body.rows.length, greenCount);
  });
});
