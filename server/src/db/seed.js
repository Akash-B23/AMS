import "dotenv/config";
import bcrypt from "bcryptjs";
import { withPoolBypass } from "./context.js";
import { createPool } from "./pool.js";

const DEFAULT_PASSWORD = "password123";

const societies = [
  { name: "Greenview Apartments", slug: "greenview-apartments" },
  { name: "Sunrise Heights", slug: "sunrise-heights" },
];

const societyUsers = [
  { email: "resident@ams.local", role: "resident", residentType: "owner" },
  { email: "tenant@ams.local", role: "tenant", residentType: "tenant" },
  { email: "manager@ams.local", role: "manager", residentType: null },
  { email: "admin@ams.local", role: "admin", residentType: null },
  { email: "staff@ams.local", role: "association_staff", residentType: null },
  { email: "treasurer@ams.local", role: "treasurer", residentType: null },
];

async function seedSociety(client, society, passwordHash) {
  const existing = await client.query(
    "SELECT id FROM societies WHERE slug = $1 LIMIT 1",
    [society.slug],
  );

  let societyId;
  if (existing.rows[0]) {
    societyId = existing.rows[0].id;
    console.log(`Society ${society.slug} already exists, reusing.`);
  } else {
    const inserted = await client.query(
      "INSERT INTO societies (name, slug) VALUES ($1, $2) RETURNING id",
      [society.name, society.slug],
    );
    societyId = inserted.rows[0].id;
    console.log(`Created society ${society.slug}.`);
  }

  const existingBlocks = await client.query(
    "SELECT id FROM blocks WHERE society_id = $1 AND name = 'Block A' LIMIT 1",
    [societyId],
  );

  let blockId;
  if (existingBlocks.rows[0]) {
    blockId = existingBlocks.rows[0].id;
  } else {
    const inserted = await client.query(
      "INSERT INTO blocks (society_id, name) VALUES ($1, 'Block A') RETURNING id",
      [societyId],
    );
    blockId = inserted.rows[0].id;
    console.log(`Created Block A for ${society.slug}.`);
  }

  const existingFlats = await client.query(
    "SELECT id, flat_number FROM flats WHERE block_id = $1",
    [blockId],
  );
  const flatByNumber = new Map(
    existingFlats.rows.map((f) => [f.flat_number, f.id]),
  );

  for (const flatNumber of ["101", "102"]) {
    if (!flatByNumber.has(flatNumber)) {
      const inserted = await client.query(
        `INSERT INTO flats (society_id, block_id, flat_number, floor)
         VALUES ($1, $2, $3, 1) RETURNING id`,
        [societyId, blockId, flatNumber],
      );
      flatByNumber.set(flatNumber, inserted.rows[0].id);
      console.log(`Created flat ${flatNumber} for ${society.slug}.`);
    }
  }

  const flat101 = flatByNumber.get("101");
  const flat102 = flatByNumber.get("102");

  for (const seed of societyUsers) {
    const existingUser = await client.query(
      "SELECT id FROM users WHERE society_id = $1 AND email = $2 LIMIT 1",
      [societyId, seed.email],
    );
    if (existingUser.rows[0]) {
      console.log(`User ${seed.email}@${society.slug} already exists, skipping.`);
      continue;
    }

    let residentId = null;
    if (seed.residentType) {
      const flatId = seed.role === "resident" ? flat101 : flat102;
      const name =
        seed.role === "resident" ? "Ravi Owner" : "Priya Tenant";
      const residentRows = await client.query(
        `INSERT INTO residents (society_id, flat_id, name, email, resident_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [societyId, flatId, name, seed.email, seed.residentType],
      );
      residentId = residentRows.rows[0].id;
    }

    await client.query(
      `INSERT INTO users (society_id, email, password_hash, role, resident_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [societyId, seed.email, passwordHash, seed.role, residentId],
    );
    console.log(`Created user ${seed.email} (${seed.role}) for ${society.slug}.`);
  }

  return societyId;
}

async function seedPlatformSuperadmin(client, passwordHash) {
  const email = "superadmin@ams.local";
  const existing = await client.query(
    "SELECT id FROM users WHERE email = $1 AND role = 'platform_superadmin' LIMIT 1",
    [email],
  );
  if (existing.rows[0]) {
    console.log(`Platform superadmin ${email} already exists, skipping.`);
    return;
  }

  await client.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'platform_superadmin')`,
    [email, passwordHash],
  );
  console.log(`Created platform superadmin ${email}.`);
}

async function seed() {
  const pool = createPool();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    await withPoolBypass(pool, async (client) => {
      for (const society of societies) {
        await seedSociety(client, society, passwordHash);
      }
      await seedPlatformSuperadmin(client, passwordHash);
    });

    console.log(
      `\nSeed complete. Default password for all users: ${DEFAULT_PASSWORD}`,
    );
    console.log(
      "Society logins: /greenview-apartments/login or /sunrise-heights/login",
    );
    console.log("Platform login: /platform/login (superadmin@ams.local)");
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
