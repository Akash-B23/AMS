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



  await seedSampleInvoices(client, societyId, flat101, flat102);
  await seedSampleComplaints(client, societyId, flat101);
  await seedSampleFinance(client, societyId);

  return societyId;
}



async function seedSampleInvoices(client, societyId, flat101, flat102) {

  const owner = await client.query(

    `SELECT id FROM residents

     WHERE society_id = $1 AND flat_id = $2 AND is_active = true

     ORDER BY CASE resident_type WHEN 'tenant' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END

     LIMIT 1`,

    [societyId, flat101],

  );

  const tenant = await client.query(

    `SELECT id FROM residents

     WHERE society_id = $1 AND flat_id = $2 AND is_active = true

     ORDER BY CASE resident_type WHEN 'tenant' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END

     LIMIT 1`,

    [societyId, flat102],

  );



  const ownerId = owner.rows[0]?.id;

  const tenantId = tenant.rows[0]?.id;

  if (!ownerId && !tenantId) {

    return;

  }



  const now = new Date();

  const year = now.getFullYear();

  const month = now.getMonth() + 1;

  const billingPeriod = `${year}-${String(month).padStart(2, "0")}-01`;

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;



  const prev = new Date(Date.UTC(year, month - 2, 1));

  const prevYear = prev.getUTCFullYear();

  const prevMonth = prev.getUTCMonth() + 1;

  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

  const prevLastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();

  const prevDue = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;



  if (ownerId) {

    await client.query(

      `INSERT INTO invoices (

         society_id, flat_id, billed_resident_id, billing_period,

         amount_paise, status, due_date

       )

       VALUES ($1, $2, $3, $4::date, 500000, 'pending', $5::date)

       ON CONFLICT (society_id, flat_id, billing_period) DO NOTHING`,

      [societyId, flat101, ownerId, billingPeriod, dueDate],

    );

    await client.query(

      `INSERT INTO invoices (

         society_id, flat_id, billed_resident_id, billing_period,

         amount_paise, status, due_date, paid_at

       )

       VALUES ($1, $2, $3, $4::date, 500000, 'paid', $5::date, NOW())

       ON CONFLICT (society_id, flat_id, billing_period) DO NOTHING`,

      [societyId, flat101, ownerId, prevPeriod, prevDue],

    );

  }



  if (tenantId) {

    await client.query(

      `INSERT INTO invoices (

         society_id, flat_id, billed_resident_id, billing_period,

         amount_paise, status, due_date

       )

       VALUES ($1, $2, $3, $4::date, 500000, 'pending', $5::date)

       ON CONFLICT (society_id, flat_id, billing_period) DO NOTHING`,

      [societyId, flat102, tenantId, billingPeriod, dueDate],

    );

  }



  console.log(`Seeded sample invoices for society ${societyId}.`);

}



async function seedSampleComplaints(client, societyId, flat101) {

  const owner = await client.query(

    `SELECT r.id AS resident_id, u.id AS user_id

     FROM residents r

     JOIN users u ON u.resident_id = r.id AND u.society_id = r.society_id

     WHERE r.society_id = $1 AND r.flat_id = $2 AND r.is_active = true

     ORDER BY CASE r.resident_type WHEN 'owner' THEN 0 ELSE 1 END

     LIMIT 1`,

    [societyId, flat101],

  );

  if (!owner.rows[0]) {

    return;

  }

  const { resident_id: residentId, user_id: userId } = owner.rows[0];

  const existing = await client.query(

    `SELECT 1 FROM complaints

     WHERE society_id = $1 AND raised_by_resident_id = $2

     LIMIT 1`,

    [societyId, residentId],

  );

  if (existing.rows[0]) {

    return;

  }

  await client.query(

    `INSERT INTO complaints (

       society_id, flat_id, raised_by_resident_id, raised_by_user_id,

       category, title, description, status

     )

     VALUES

       ($1, $2, $3, $4, 'plumbing', 'Kitchen sink leak',

        'Water drips under the kitchen sink whenever the tap is on.', 'open'),

       ($1, $2, $3, $4, 'lift', 'Lift noise on floor 1',

        'Unusual grinding sound from the lift near flat 101 in the evenings.', 'open')`,

    [societyId, flat101, residentId, userId],

  );

  console.log(`Seeded sample complaints for society ${societyId}.`);

}



async function seedSampleFinance(client, societyId) {

  const treasurer = await client.query(

    `SELECT id FROM users

     WHERE society_id = $1 AND role = 'treasurer'

     LIMIT 1`,

    [societyId],

  );

  const treasurerId = treasurer.rows[0]?.id;

  if (!treasurerId) {

    return;

  }

  const existingVendor = await client.query(

    `SELECT id FROM vendors

     WHERE society_id = $1 AND name = 'BrightLift Services'

     LIMIT 1`,

    [societyId],

  );

  let vendorId = existingVendor.rows[0]?.id;

  if (!vendorId) {

    const vendor = await client.query(

      `INSERT INTO vendors (

         society_id, name, contact_name, phone, email, notes

       )

       VALUES (

         $1, 'BrightLift Services', 'Suresh Kumar', '9876512345',

         'suresh@brightlift.example', 'Lift AMC and repair vendor'

       )

       RETURNING id`,

      [societyId],

    );

    vendorId = vendor.rows[0].id;

  }

  const existingQuotation = await client.query(

    `SELECT id FROM quotations

     WHERE society_id = $1 AND vendor_id = $2 AND title = 'Annual lift AMC'

     LIMIT 1`,

    [societyId, vendorId],

  );

  if (!existingQuotation.rows[0]) {

    await client.query(

      `INSERT INTO quotations (

         society_id, vendor_id, title, description, amount_paise,

         submitted_by_user_id, status

       )

       VALUES (

         $1, $2, 'Annual lift AMC',

         'Yearly comprehensive AMC covering both lifts.',

         8500000, $3, 'pending'

       )`,

      [societyId, vendorId, treasurerId],

    );

  }

  const existingExpense = await client.query(

    `SELECT id FROM expenses

     WHERE society_id = $1 AND title = 'Corridor lighting repairs'

     LIMIT 1`,

    [societyId],

  );

  if (!existingExpense.rows[0]) {

    await client.query(

      `INSERT INTO expenses (

         society_id, vendor_id, category, title, description,

         amount_paise, expense_date, recorded_by_user_id

       )

       VALUES (

         $1, $2, 'repairs', 'Corridor lighting repairs',

         'Replaced faulty fixtures on Block A corridor.',

         125000, CURRENT_DATE, $3

       )`,

      [societyId, vendorId, treasurerId],

    );

  }

  const existingActivity = await client.query(

    `SELECT id FROM maintenance_activities

     WHERE society_id = $1 AND title = 'Quarterly lift inspection'

     LIMIT 1`,

    [societyId],

  );

  if (!existingActivity.rows[0]) {

    await client.query(

      `INSERT INTO maintenance_activities (

         society_id, vendor_id, category, title, description,

         status, activity_date, logged_by_user_id

       )

       VALUES (

         $1, $2, 'lift', 'Quarterly lift inspection',

         'Scheduled inspection and lubrication for both lifts.',

         'planned', CURRENT_DATE, $3

       )`,

      [societyId, vendorId, treasurerId],

    );

  }

  console.log(`Seeded sample vendors/expenses/activities for society ${societyId}.`);

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


