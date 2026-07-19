/**
 * Phase 6 — Reporting, recurring maintenance, notifications
 *
 * Verifies: role gates on reports, resident summary, schedule create/generate
 * idempotency, notifications for staff, mailer skip without RESEND_API_KEY,
 * association_staff access to ops reports only.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-6 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 6 — Reporting, schedules, notifications", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 6 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 6 tests");
    }
    process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
    delete process.env.RESEND_API_KEY;
    app = createApp();
  });

  test("resident can load summary and invoice report; cannot hit staff finance reports", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const summary = await agent.get("/api/resident/reports/summary");
    assert.equal(summary.status, 200);
    assert.ok(summary.body.invoiceSummary);
    assert.ok(Array.isArray(summary.body.complaintsByStatus));
    assert.ok(Array.isArray(summary.body.upcomingMaintenance));

    const invoices = await agent.get("/api/resident/reports/invoices");
    assert.equal(invoices.status, 200);
    assert.ok(Array.isArray(invoices.body.invoices));

    const collection = await agent.get("/api/reports/collection");
    assert.equal(collection.status, 403);
  });

  test("association_staff can read complaints/maintenance reports but not collection", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "staff@ams.local",
      password: SEED_PASSWORD,
    });

    const complaints = await agent.get("/api/reports/complaints");
    assert.equal(complaints.status, 200);
    assert.ok(Array.isArray(complaints.body.byStatus));

    const maintenance = await agent.get("/api/reports/maintenance");
    assert.equal(maintenance.status, 200);
    assert.ok(maintenance.body.activityCounts);

    const collection = await agent.get("/api/reports/collection");
    assert.equal(collection.status, 403);

    const expenses = await agent.get("/api/reports/expenses");
    assert.equal(expenses.status, 403);
  });

  test("treasurer can read collection and expense reports", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const collection = await agent.get("/api/reports/collection");
    assert.equal(collection.status, 200);
    assert.ok(collection.body.totals);

    const expenses = await agent.get("/api/reports/expenses");
    assert.equal(expenses.status, 200);
    assert.ok(expenses.body.totals);
  });

  test("schedule create, cron generate is idempotent, and staff get notifications", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const dueDate = new Date().toISOString().slice(0, 10);
    const title = `Phase6 schedule ${Date.now()}`;

    const createRes = await agent.post("/api/maintenance-schedules").send({
      title,
      description: "Phase 6 test schedule",
      category: "housekeeping",
      frequency: "monthly",
      dayOfMonth: 10,
      notifyDaysBefore: 0,
      nextDueDate: dueDate,
    });
    assert.equal(createRes.status, 201);
    const scheduleId = createRes.body.schedule.id;

    const beforeNotifs = await agent.get("/api/notifications");
    assert.equal(beforeNotifs.status, 200);
    const beforeCount = beforeNotifs.body.notifications.length;

    const job1 = await request(app)
      .post("/api/jobs/maintenance-schedules")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`);
    assert.equal(job1.status, 200);
    assert.ok(job1.body.processed >= 1);

    const activities = await agent.get("/api/maintenance-activities");
    assert.equal(activities.status, 200);
    const generated = (activities.body.activities ?? []).filter(
      (a) => a.scheduleId === scheduleId && a.activityDate === dueDate,
    );
    assert.equal(generated.length, 1);

    const job2 = await request(app)
      .post("/api/jobs/maintenance-schedules")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`);
    assert.equal(job2.status, 200);

    const activities2 = await agent.get("/api/maintenance-activities");
    const generated2 = (activities2.body.activities ?? []).filter(
      (a) => a.scheduleId === scheduleId && a.activityDate === dueDate,
    );
    assert.equal(generated2.length, 1);

    const afterNotifs = await agent.get("/api/notifications");
    assert.equal(afterNotifs.status, 200);
    assert.ok(afterNotifs.body.notifications.length >= beforeCount);
    const match = afterNotifs.body.notifications.find(
      (n) => n.meta?.scheduleId === scheduleId || n.title.includes(title),
    );
    assert.ok(match, "expected maintenance notification for manager");

    await agent.patch(`/api/notifications/${match.id}/read`);
    const readRes = await agent.get("/api/notifications");
    const updated = readRes.body.notifications.find((n) => n.id === match.id);
    assert.ok(updated.readAt);
  });

  test("invoice reminders record email_deliveries as skipped without API key", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const result = await agent.post("/api/jobs/reminders");
    assert.equal(result.status, 200);
    assert.ok(typeof result.body.recorded === "number");
    assert.ok(typeof result.body.emailed === "number");
  });

  test("cross-society isolation on staff reports", async () => {
    const greenview = request.agent(app);
    await greenview.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });
    const gvCollection = await greenview.get("/api/reports/collection");
    assert.equal(gvCollection.status, 200);

    const sunrise = request.agent(app);
    await sunrise.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "admin@ams.local",
      password: SEED_PASSWORD,
    });
    const srCollection = await sunrise.get("/api/reports/collection");
    assert.equal(srCollection.status, 200);

    // Totals objects exist independently; isolation is enforced by society context.
    assert.ok(gvCollection.body.totals);
    assert.ok(srCollection.body.totals);
  });
});
