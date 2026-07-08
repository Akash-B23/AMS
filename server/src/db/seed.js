import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPool } from "./pool.js";

const DEFAULT_PASSWORD = "password123";

const seedUsers = [
  { email: "resident@ams.local", role: "resident", residentType: "owner" },
  { email: "tenant@ams.local", role: "tenant", residentType: "tenant" },
  { email: "manager@ams.local", role: "manager", residentType: null },
  { email: "admin@ams.local", role: "admin", residentType: null },
  { email: "staff@ams.local", role: "association_staff", residentType: null },
  { email: "treasurer@ams.local", role: "treasurer", residentType: null },
];

async function seed() {
  const pool = createPool();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    const existingBlocks = await pool.query(
      "SELECT id FROM blocks WHERE name = 'Block A' LIMIT 1",
    );

    let blockId;
    if (existingBlocks.rows[0]) {
      blockId = existingBlocks.rows[0].id;
      console.log("Block A already exists, reusing.");
    } else {
      const inserted = await pool.query(
        "INSERT INTO blocks (name) VALUES ('Block A') RETURNING id",
      );
      blockId = inserted.rows[0].id;
      console.log("Created Block A.");
    }

    const existingFlats = await pool.query(
      "SELECT id, flat_number FROM flats WHERE block_id = $1",
      [blockId],
    );
    const flatByNumber = new Map(
      existingFlats.rows.map((f) => [f.flat_number, f.id]),
    );

    for (const flatNumber of ["101", "102"]) {
      if (!flatByNumber.has(flatNumber)) {
        const inserted = await pool.query(
          "INSERT INTO flats (block_id, flat_number, floor) VALUES ($1, $2, 1) RETURNING id",
          [blockId, flatNumber],
        );
        flatByNumber.set(flatNumber, inserted.rows[0].id);
        console.log(`Created flat ${flatNumber}.`);
      }
    }

    const flat101 = flatByNumber.get("101");
    const flat102 = flatByNumber.get("102");

    for (const seed of seedUsers) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1 LIMIT 1",
        [seed.email],
      );
      if (existing.rows[0]) {
        console.log(`User ${seed.email} already exists, skipping.`);
        continue;
      }

      let residentId = null;
      if (seed.residentType) {
        const flatId = seed.role === "resident" ? flat101 : flat102;
        const name =
          seed.role === "resident" ? "Ravi Owner" : "Priya Tenant";
        const residentRows = await pool.query(
          `INSERT INTO residents (flat_id, name, email, resident_type)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [flatId, name, seed.email, seed.residentType],
        );
        residentId = residentRows.rows[0].id;
      }

      await pool.query(
        `INSERT INTO users (email, password_hash, role, resident_id)
         VALUES ($1, $2, $3, $4)`,
        [seed.email, passwordHash, seed.role, residentId],
      );
      console.log(`Created user ${seed.email} (${seed.role}).`);
    }

    console.log(
      `\nSeed complete. Default password for all users: ${DEFAULT_PASSWORD}`,
    );
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
