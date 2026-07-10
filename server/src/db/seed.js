import "dotenv/config";
import bcrypt from "bcryptjs";
import { withPoolBypass } from "./context.js";
import { createPool } from "./pool.js";
import { createAmenity } from "./queries/amenities.js";
import { createSociety } from "./queries/societies.js";
import { createUser } from "./queries/users.js";
import { createVehicle } from "./queries/vehicles.js";
import { seedBlockAndFlats } from "../services/setupService.js";

const DEFAULT_PASSWORD = "password123";

const societies = [
  { name: "Greenview Apartments", slug: "greenview-apartments" },
  { name: "Sunrise Heights", slug: "sunrise-heights" },
];

const societyUsers = [
  {
    email: "resident@ams.local",
    role: "resident",
    residentType: "owner",
    name: "Ravi Owner",
    phone: "9876500001",
  },
  {
    email: "tenant@ams.local",
    role: "tenant",
    residentType: "tenant",
    name: "Priya Tenant",
    phone: "9876500002",
  },
  { email: "manager@ams.local", role: "manager", residentType: null },
  { email: "admin@ams.local", role: "admin", residentType: null },
  { email: "staff@ams.local", role: "association_staff", residentType: null },
  { email: "treasurer@ams.local", role: "treasurer", residentType: null },
];

const defaultAmenities = [
  { name: "Pool", description: "Swimming pool" },
  { name: "Gym", description: "Fitness center" },
  { name: "Clubhouse", description: "Community clubhouse" },
];

async function seedAmenities(client, societyId) {
  for (const amenity of defaultAmenities) {
    const existing = await client.query(
      "SELECT id FROM amenities WHERE society_id = $1 AND name = $2 LIMIT 1",
      [societyId, amenity.name],
    );
    if (existing.rows[0]) {
      continue;
    }
    await createAmenity(client, societyId, amenity);
    console.log(`Created amenity ${amenity.name}.`);
  }
}

async function seedResidentVehicle(client, societyId, residentId, registrationNumber) {
  const existing = await client.query(
    `SELECT id FROM vehicles
     WHERE society_id = $1 AND registration_number = $2 AND is_active = true
     LIMIT 1`,
    [societyId, registrationNumber],
  );
  if (existing.rows[0]) {
    return;
  }
  await createVehicle(client, societyId, residentId, {
    registrationNumber,
    vehicleType: "car",
    makeModel: "Honda City",
    parkingSlot: "P-12",
  });
  console.log(`Created vehicle ${registrationNumber}.`);
}

async function seedSociety(client, society, passwordHash) {
  const existing = await client.query(
    "SELECT id, setup_completed_at FROM societies WHERE slug = $1 LIMIT 1",
    [society.slug],
  );

  let societyId;
  let setupCompletedAt;
  if (existing.rows[0]) {
    societyId = existing.rows[0].id;
    setupCompletedAt = existing.rows[0].setup_completed_at;
    console.log(`Society ${society.slug} already exists, reusing.`);
  } else {
    const inserted = await createSociety(client, society);
    societyId = inserted.id;
    console.log(`Created society ${society.slug}.`);
  }

  const { flatIds } = await seedBlockAndFlats(client, societyId, "Block A", [
    "101",
    "102",
  ]);

  const flat101 = flatIds.get("101");
  const flat102 = flatIds.get("102");

  let ownerResidentId = null;

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
      const existingResident = await client.query(
        `SELECT id FROM residents
         WHERE society_id = $1 AND email = $2
         LIMIT 1`,
        [societyId, seed.email],
      );
      if (existingResident.rows[0]) {
        residentId = existingResident.rows[0].id;
      } else {
        const residentRows = await client.query(
          `INSERT INTO residents (society_id, flat_id, name, phone, email, resident_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            societyId,
            flatId,
            seed.name,
            seed.phone ?? null,
            seed.email,
            seed.residentType,
          ],
        );
        residentId = residentRows.rows[0].id;
      }
      if (seed.role === "resident") {
        ownerResidentId = residentId;
      }
    }

    await createUser(client, {
      societyId,
      email: seed.email,
      passwordHash,
      role: seed.role,
      residentId,
      displayName: seed.name ?? null,
    });
    console.log(`Created user ${seed.email} (${seed.role}) for ${society.slug}.`);
  }

  await client.query(
    `UPDATE residents SET phone = CASE email
       WHEN 'resident@ams.local' THEN '9876500001'
       WHEN 'tenant@ams.local' THEN '9876500002'
       ELSE phone
     END,
     name = CASE email
       WHEN 'resident@ams.local' THEN 'Ravi Owner'
       WHEN 'tenant@ams.local' THEN 'Priya Tenant'
       ELSE name
     END,
     updated_at = NOW()
     WHERE society_id = $1`,
    [societyId],
  );

  if (!ownerResidentId) {
    const ownerRow = await client.query(
      `SELECT id FROM residents
       WHERE society_id = $1 AND email = 'resident@ams.local'
       LIMIT 1`,
      [societyId],
    );
    ownerResidentId = ownerRow.rows[0]?.id ?? null;
  }

  if (ownerResidentId) {
    await seedResidentVehicle(client, societyId, ownerResidentId, "KA01AB1234");
  }

  await seedAmenities(client, societyId);

  if (!setupCompletedAt) {
    await client.query(
      `UPDATE flats SET maintenance_amount_paise = 500000, updated_at = NOW()
       WHERE society_id = $1 AND maintenance_amount_paise IS NULL`,
      [societyId],
    );
    await client.query(
      `UPDATE societies SET setup_completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND setup_completed_at IS NULL`,
      [societyId],
    );
    console.log(`Marked setup complete for ${society.slug}.`);
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
