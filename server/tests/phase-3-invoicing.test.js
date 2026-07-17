/**
 * Phase 3 — Invoicing & Dues
 *
 * Verifies: invoice generation idempotency, pending dues, resident isolation,
 * role gates, manual payment submit/verify/reject, cron auth.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-3 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 3 — Invoicing & Dues", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 3 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 3 tests");
    }
    process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
    app = createApp();
  });

  test("manager gets 403 on invoice generate", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.post("/api/invoices/generate").send({});
    assert.equal(res.status, 403);
  });

  test("admin can generate invoices idempotently", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const first = await agent.post("/api/invoices/generate").send({});
    assert.equal(first.status, 200);
    assert.ok(first.body.summary);
    assert.ok(typeof first.body.summary.created === "number");

    const second = await agent.post("/api/invoices/generate").send({});
    assert.equal(second.status, 200);
    assert.equal(second.body.summary.created, 0);
    assert.ok(second.body.summary.skippedExisting >= 1);
  });

  test("treasurer can view pending dues", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/invoices/dues");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.invoices));
    assert.ok(res.body.totals);
    assert.ok(typeof res.body.totals.amountPaise === "number");
  });

  test("resident sees only own dues", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/resident/dues");
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.amountDuePaise === "number");
    for (const inv of res.body.unpaidInvoices) {
      assert.ok(inv.flatNumber === "101" || inv.blockName);
    }
    // Tenant flat invoices must not appear for owner resident
    for (const inv of [
      ...res.body.unpaidInvoices,
      ...res.body.paidInvoices,
    ]) {
      assert.notEqual(inv.flatNumber, "102");
    }
  });

  test("tenant isolation: greenview dues not visible from sunrise session", async () => {
    const greenAgent = request.agent(app);
    await greenAgent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });
    const greenDues = await greenAgent.get("/api/invoices/dues");
    assert.equal(greenDues.status, 200);
    const greenIds = new Set(greenDues.body.invoices.map((i) => i.id));

    const sunriseAgent = request.agent(app);
    await sunriseAgent.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });
    const sunriseDues = await sunriseAgent.get("/api/invoices/dues");
    assert.equal(sunriseDues.status, 200);

    for (const inv of sunriseDues.body.invoices) {
      assert.equal(greenIds.has(inv.id), false);
    }
  });

  test("resident submit → staff verify marks invoice paid", async () => {
    const resident = request.agent(app);
    await resident.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const dues = await resident.get("/api/resident/dues");
    assert.equal(dues.status, 200);
    const invoice = (dues.body.unpaidInvoices ?? []).find(
      (inv) => inv.displayStatus !== "awaiting_verification",
    );
    if (!invoice) {
      return;
    }

    const submit = await resident
      .post(`/api/resident/invoices/${invoice.id}/submit-payment`)
      .send({ transactionRef: "UTRTESTVERIFY001" });
    assert.equal(submit.status, 200);
    assert.equal(submit.body.payment.status, "created");
    assert.equal(submit.body.invoice.displayStatus, "awaiting_verification");

    const duplicate = await resident
      .post(`/api/resident/invoices/${invoice.id}/submit-payment`)
      .send({ transactionRef: "UTRTESTVERIFY002" });
    assert.equal(duplicate.status, 409);

    const admin = request.agent(app);
    await admin.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const verify = await admin
      .post(`/api/invoices/${invoice.id}/verify-payment`)
      .send({});
    assert.equal(verify.status, 200);
    assert.equal(verify.body.invoice.status, "paid");
    assert.equal(verify.body.payment.status, "captured");
  });

  test("resident submit → staff reject allows resubmit", async () => {
    const resident = request.agent(app);
    await resident.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const dues = await resident.get("/api/resident/dues");
    assert.equal(dues.status, 200);
    const invoice = (dues.body.unpaidInvoices ?? []).find(
      (inv) => inv.displayStatus !== "awaiting_verification",
    );
    if (!invoice) {
      return;
    }

    const submit = await resident
      .post(`/api/resident/invoices/${invoice.id}/submit-payment`)
      .send({ transactionRef: "UTRTESTREJECT001" });
    assert.equal(submit.status, 200);

    const admin = request.agent(app);
    await admin.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const reject = await admin
      .post(`/api/invoices/${invoice.id}/reject-payment`)
      .send({ notes: "Invalid UTR" });
    assert.equal(reject.status, 200);
    assert.equal(reject.body.payment.status, "failed");
    assert.equal(reject.body.invoice.status, "pending");

    const resubmit = await resident
      .post(`/api/resident/invoices/${invoice.id}/submit-payment`)
      .send({ transactionRef: "UTRTESTREJECT002" });
    assert.equal(resubmit.status, 200);
    assert.equal(resubmit.body.payment.status, "created");
  });

  test("cron monthly-invoices requires secret", async () => {
    const unauthorized = await request(app)
      .post("/api/jobs/monthly-invoices")
      .send({});
    assert.equal(unauthorized.status, 401);

    const ok = await request(app)
      .post("/api/jobs/monthly-invoices")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`)
      .send({});
    assert.equal(ok.status, 200);
    assert.ok(Array.isArray(ok.body.societies));
  });

  test("admin can mark invoice paid offline", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const dues = await agent.get("/api/invoices/dues");
    assert.equal(dues.status, 200);
    const invoice = (dues.body.invoices ?? []).find(
      (inv) => inv.displayStatus !== "awaiting_verification",
    );
    if (!invoice) {
      return;
    }

    const res = await agent.post(`/api/invoices/${invoice.id}/mark-paid`).send({
      method: "cash",
      notes: "Phase 3 test payment",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.invoice.status, "paid");
    assert.equal(res.body.payment.status, "captured");
  });

  test("admin can run reminder stubs", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.post("/api/invoices/reminders").send({});
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.recorded === "number");
    assert.ok(typeof res.body.skipped === "number");
  });
});
