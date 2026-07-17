/**
 * Phase 4 — Complaints
 *
 * Verifies: resident create/list (own only), manager status update,
 * role gates, cross-society isolation.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-4 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 4 — Complaints", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 4 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 4 tests");
    }
    app = createApp();
  });

  test("treasurer gets 403 on society complaints list", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "treasurer@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/complaints");
    assert.equal(res.status, 403);
  });

  test("resident can create and list own complaints", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const created = await agent.post("/api/resident/complaints").send({
      category: "plumbing",
      title: "Bathroom tap drip",
      description: "Cold water tap drips overnight in the bathroom.",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.complaint.status, "open");
    assert.equal(created.body.complaint.category, "plumbing");
    assert.ok(created.body.complaint.id);

    const list = await agent.get("/api/resident/complaints");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body.complaints));
    assert.ok(
      list.body.complaints.some((c) => c.id === created.body.complaint.id),
    );

    const one = await agent.get(
      `/api/resident/complaints/${created.body.complaint.id}`,
    );
    assert.equal(one.status, 200);
    assert.equal(one.body.complaint.id, created.body.complaint.id);
  });

  test("resident cannot PATCH staff complaints route", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const list = await agent.get("/api/resident/complaints");
    const complaint = list.body.complaints?.[0];
    if (!complaint) {
      return;
    }

    const res = await agent.patch(`/api/complaints/${complaint.id}`).send({
      status: "in_progress",
    });
    assert.equal(res.status, 403);
  });

  test("manager can update complaint status", async () => {
    const resident = request.agent(app);
    await resident.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const created = await resident.post("/api/resident/complaints").send({
      category: "electrical",
      title: "Corridor light out",
      description: "Light near the stairwell on floor 1 is not working.",
    });
    assert.equal(created.status, 201);
    const complaintId = created.body.complaint.id;

    const manager = request.agent(app);
    await manager.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const list = await manager.get("/api/complaints?status=open");
    assert.equal(list.status, 200);
    assert.ok(list.body.complaints.some((c) => c.id === complaintId));

    const updated = await manager.patch(`/api/complaints/${complaintId}`).send({
      status: "in_progress",
      staffNotes: "Electrician scheduled",
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.complaint.status, "in_progress");
    assert.equal(updated.body.complaint.staffNotes, "Electrician scheduled");

    const resolved = await manager
      .patch(`/api/complaints/${complaintId}`)
      .send({ status: "resolved" });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.complaint.status, "resolved");
    assert.ok(resolved.body.complaint.resolvedAt);
  });

  test("tenant isolation: greenview complaints not visible from sunrise", async () => {
    const green = request.agent(app);
    await green.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });
    const greenList = await green.get("/api/complaints");
    assert.equal(greenList.status, 200);
    const greenIds = new Set(greenList.body.complaints.map((c) => c.id));

    const sunrise = request.agent(app);
    await sunrise.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });
    const sunriseList = await sunrise.get("/api/complaints");
    assert.equal(sunriseList.status, 200);

    for (const c of sunriseList.body.complaints) {
      assert.equal(greenIds.has(c.id), false);
    }
  });

  test("resident cannot view another resident complaint by id", async () => {
    const tenant = request.agent(app);
    await tenant.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "tenant@ams.local",
      password: SEED_PASSWORD,
    });

    const created = await tenant.post("/api/resident/complaints").send({
      category: "noise",
      title: "Late night noise",
      description: "Loud music from neighboring flat after 11pm.",
    });
    assert.equal(created.status, 201);

    const owner = request.agent(app);
    await owner.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await owner.get(
      `/api/resident/complaints/${created.body.complaint.id}`,
    );
    assert.equal(res.status, 403);
  });
});
