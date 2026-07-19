/**
 * Phase 5 — Expenses, vendors, quotations, maintenance activities
 *
 * Verifies: role gates, expense create, quotation approve/reject,
 * maintenance activity create/status, cross-society isolation.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-5 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 5 — Expenses, vendors, quotations, activities", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 5 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 5 tests");
    }
    app = createApp();
  });

  test("manager gets 403 on expenses and vendors", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const expenses = await agent.get("/api/expenses");
    assert.equal(expenses.status, 403);

    const vendors = await agent.get("/api/vendors");
    assert.equal(vendors.status, 403);

    const quotations = await agent.get("/api/quotations");
    assert.equal(quotations.status, 403);
  });

  test("treasurer can create vendor, quotation, approve, and expense", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const vendorRes = await agent.post("/api/vendors").send({
      name: `Phase5 Vendor ${Date.now()}`,
      contactName: "Test Contact",
      phone: "9999900001",
    });
    assert.equal(vendorRes.status, 201);
    const vendorId = vendorRes.body.vendor.id;

    const quotationRes = await agent.post("/api/quotations").send({
      vendorId,
      title: "Pump replacement quote",
      description: "Replace community water pump motor.",
      amountPaise: 4500000,
    });
    assert.equal(quotationRes.status, 201);
    assert.equal(quotationRes.body.quotation.status, "pending");
    const quotationId = quotationRes.body.quotation.id;

    const approveRes = await agent.post(
      `/api/quotations/${quotationId}/approve`,
    );
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.quotation.status, "approved");

    const reApprove = await agent.post(
      `/api/quotations/${quotationId}/approve`,
    );
    assert.equal(reApprove.status, 409);

    const expenseRes = await agent.post("/api/expenses").send({
      category: "repairs",
      title: "Water pump motor replacement",
      description: "Paid against approved quotation",
      amountPaise: 4500000,
      vendorId,
      quotationId,
    });
    assert.equal(expenseRes.status, 201);
    assert.equal(expenseRes.body.expense.amountPaise, 4500000);
    assert.equal(expenseRes.body.expense.vendorId, vendorId);
    assert.equal(expenseRes.body.expense.quotationId, quotationId);

    const list = await agent.get("/api/expenses?category=repairs");
    assert.equal(list.status, 200);
    assert.ok(
      list.body.expenses.some((e) => e.id === expenseRes.body.expense.id),
    );
  });

  test("treasurer can reject quotation with reason", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const vendors = await agent.get("/api/vendors?activeOnly=true");
    assert.equal(vendors.status, 200);
    const vendorId = vendors.body.vendors[0]?.id;
    assert.ok(vendorId);

    const quotationRes = await agent.post("/api/quotations").send({
      vendorId,
      title: `Reject me ${Date.now()}`,
      amountPaise: 100000,
    });
    assert.equal(quotationRes.status, 201);
    const quotationId = quotationRes.body.quotation.id;

    const missingReason = await agent
      .post(`/api/quotations/${quotationId}/reject`)
      .send({});
    assert.equal(missingReason.status, 400);

    const rejected = await agent
      .post(`/api/quotations/${quotationId}/reject`)
      .send({ rejectionReason: "Price too high for this year" });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.quotation.status, "rejected");
    assert.equal(
      rejected.body.quotation.rejectionReason,
      "Price too high for this year",
    );
  });

  test("manager can create and update maintenance activities", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const created = await agent.post("/api/maintenance-activities").send({
      category: "plumbing",
      title: `Tank cleaning ${Date.now()}`,
      description: "Overhead tank seasonal clean",
      status: "planned",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.activity.status, "planned");
    const activityId = created.body.activity.id;

    const updated = await agent
      .patch(`/api/maintenance-activities/${activityId}`)
      .send({ status: "in_progress" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.activity.status, "in_progress");

    const completed = await agent
      .patch(`/api/maintenance-activities/${activityId}`)
      .send({ status: "completed" });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.activity.status, "completed");

    const invalid = await agent
      .patch(`/api/maintenance-activities/${activityId}`)
      .send({ status: "planned" });
    assert.equal(invalid.status, 409);
  });

  test("tenant isolation: greenview expenses not visible from sunrise", async () => {
    const green = request.agent(app);
    await green.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });
    const greenList = await green.get("/api/expenses");
    assert.equal(greenList.status, 200);
    const greenIds = new Set(greenList.body.expenses.map((e) => e.id));

    const sunrise = request.agent(app);
    await sunrise.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });
    const sunriseList = await sunrise.get("/api/expenses");
    assert.equal(sunriseList.status, 200);

    for (const expense of sunriseList.body.expenses) {
      assert.equal(greenIds.has(expense.id), false);
    }
  });

  test("association_staff gets 403 on maintenance activities", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "staff@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/maintenance-activities");
    assert.equal(res.status, 403);
  });
});
