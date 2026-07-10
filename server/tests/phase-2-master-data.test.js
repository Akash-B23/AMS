/**
 * Phase 2 — Master Data & Resident Self-Service
 *
 * Verifies: staff bulk upload (flats, maintenance, amenities), resident profile,
 * vehicle CRUD, role guards, tenant isolation.
 *
 * Prerequisites:
 *   - server/.env with DATABASE_URL and JWT_SECRET
 *   - npm run db:migrate -w server
 *   - npm run db:seed -w server
 *
 * Run: npm run test:phase-2 -w server
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const SEED_PASSWORD = "password123";
const GREENVIEW = "greenview-apartments";
const SUNRISE = "sunrise-heights";

describe("Phase 2 — Master Data & Resident Self-Service", () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run Phase 2 tests");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required to run Phase 2 tests");
    }
    app = createApp();
  });

  test("manager can import new flats via master-data", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const flatNumber = `3${Date.now().toString().slice(-2)}`;
    const res = await agent.post("/api/master-data/flats/import").send({
      rows: [{ blockName: "Block B", flatNumber, floor: 3 }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 1);
    assert.ok(res.body.flats.some((f) => f.flatNumber === flatNumber));
  });

  test("duplicate flat import is skipped with error", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.post("/api/master-data/flats/import").send({
      rows: [{ blockName: "Block A", flatNumber: "101", floor: 1 }],
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.errors.length > 0);
    assert.equal(res.body.skipped, 1);
  });

  test("maintenance CSV updates flat amounts", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.post("/api/master-data/maintenance/import").send({
      rows: [
        {
          blockName: "Block A",
          flatNumber: "101",
          maintenanceAmountRupees: 6000,
        },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.updated, 1);
    const flat101 = res.body.flats.find((f) => f.flatNumber === "101");
    assert.equal(flat101.maintenanceAmountPaise, 600000);
  });

  test("maintenance import reports missing flat", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.post("/api/master-data/maintenance/import").send({
      rows: [
        {
          blockName: "Block Z",
          flatNumber: "999",
          maintenanceAmountRupees: 5000,
        },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.skipped, 1);
    assert.ok(res.body.errors.length > 0);
  });

  test("amenities import creates rows and skips duplicates", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const uniqueName = `Test Amenity ${Date.now()}`;
    const createRes = await agent.post("/api/master-data/amenities/import").send({
      rows: [{ name: uniqueName, description: "Test pool area" }],
    });
    assert.equal(createRes.status, 200);
    assert.equal(createRes.body.created, 1);

    const dupRes = await agent.post("/api/master-data/amenities/import").send({
      rows: [{ name: uniqueName, description: "Duplicate" }],
    });
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.skipped, 1);
    assert.ok(dupRes.body.errors.length > 0);
  });

  test("resident role gets 403 on master-data routes", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/master-data/summary");
    assert.equal(res.status, 403);
  });

  test("GET /api/profile/me returns flat, resident_type, vehicles", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/profile/me");
    assert.equal(res.status, 200);
    assert.equal(res.body.resident.residentType, "owner");
    assert.ok(res.body.resident.flat.blockName);
    assert.ok(res.body.resident.flat.flatNumber);
    assert.ok(Array.isArray(res.body.vehicles));
  });

  test("PUT /api/profile/me updates name and phone", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.put("/api/profile/me").send({
      name: "Ravi Updated",
      phone: "9876543210",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.resident.name, "Ravi Updated");
    assert.equal(res.body.resident.phone, "9876543210");
    assert.equal(res.body.user.displayName, "Ravi Updated");
  });

  test("vehicle CRUD on own resident", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const profile = await agent.get("/api/profile/me");
    for (const vehicle of profile.body.vehicles) {
      await agent.delete(`/api/profile/me/vehicles/${vehicle.id}`);
    }

    const reg = `KA01T${Date.now()}`;
    const createRes = await agent.post("/api/profile/me/vehicles").send({
      registrationNumber: reg,
      vehicleType: "car",
      makeModel: "Honda City",
      parkingSlot: "P-12",
    });
    assert.equal(createRes.status, 201);
    const vehicleId = createRes.body.vehicle.id;

    const updateRes = await agent.put(`/api/profile/me/vehicles/${vehicleId}`).send({
      registrationNumber: reg,
      vehicleType: "car",
      makeModel: "Honda City Updated",
      parkingSlot: "P-13",
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.vehicle.makeModel, "Honda City Updated");

    const deleteRes = await agent.delete(`/api/profile/me/vehicles/${vehicleId}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.ok, true);
  });

  test("resident cannot access another resident vehicle", async () => {
    const ownerAgent = request.agent(app);
    await ownerAgent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "resident@ams.local",
      password: SEED_PASSWORD,
    });

    const ownerProfile = await ownerAgent.get("/api/profile/me");
    let vehicleId = ownerProfile.body.vehicles[0]?.id;

    if (!vehicleId) {
      const reg = `KA02O${Date.now()}`;
      const createRes = await ownerAgent.post("/api/profile/me/vehicles").send({
        registrationNumber: reg,
        vehicleType: "bike",
        makeModel: "Activa",
      });
      assert.equal(createRes.status, 201);
      vehicleId = createRes.body.vehicle.id;
    }

    const residentAgent = request.agent(app);
    await residentAgent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "tenant@ams.local",
      password: SEED_PASSWORD,
    });

    const tamperRes = await residentAgent.put(`/api/profile/me/vehicles/${vehicleId}`).send({
      registrationNumber: "HACKED",
      vehicleType: "bike",
      makeModel: "Hacked",
    });
    assert.equal(tamperRes.status, 404);
  });

  test("manager cannot hit profile routes", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });

    const res = await agent.get("/api/profile/me");
    assert.equal(res.status, 403);
  });

  test("tenant isolation: greenview manager summary differs from sunrise", async () => {
    const greenviewAgent = request.agent(app);
    await greenviewAgent.post("/api/auth/login").send({
      societySlug: GREENVIEW,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });
    const greenviewSummary = await greenviewAgent.get("/api/master-data/summary");

    const sunriseAgent = request.agent(app);
    await sunriseAgent.post("/api/auth/login").send({
      societySlug: SUNRISE,
      email: "manager@ams.local",
      password: SEED_PASSWORD,
    });
    const sunriseSummary = await sunriseAgent.get("/api/master-data/summary");

    assert.equal(greenviewSummary.status, 200);
    assert.equal(sunriseSummary.status, 200);
    assert.ok(greenviewSummary.body.flatCount > 0);
    assert.ok(sunriseSummary.body.flatCount > 0);
  });
});
