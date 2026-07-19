import "dotenv/config";
import { withPoolBypass } from "./context.js";
import { createPool } from "./pool.js";

/**
 * Remove societies created by Phase 0.5 tests or manual signup experiments.
 * Keeps seed societies (greenview-apartments, sunrise-heights) intact.
 */
async function cleanTestData() {
  const pool = createPool();

  try {
    const result = await withPoolBypass(pool, async (client) => {
      const societies = await client.query(
        `SELECT id, slug FROM societies
         WHERE slug LIKE 'test-society-%'
         ORDER BY slug`,
      );

      if (societies.rows.length === 0) {
        return { deleted: 0, slugs: [] };
      }

      const ids = societies.rows.map((r) => r.id);
      const slugs = societies.rows.map((r) => r.slug);

      await client.query(
        "DELETE FROM email_deliveries WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM notifications WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM expenses WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM quotations WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM maintenance_activities WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM maintenance_schedules WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM vendors WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM complaints WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM reminder_logs WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM payments WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM invoices WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM audit_logs WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM vehicles WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        "DELETE FROM amenities WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query("DELETE FROM users WHERE society_id = ANY($1::uuid[])", [
        ids,
      ]);
      await client.query(
        "DELETE FROM residents WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query("DELETE FROM flats WHERE society_id = ANY($1::uuid[])", [
        ids,
      ]);
      await client.query(
        "DELETE FROM blocks WHERE society_id = ANY($1::uuid[])",
        [ids],
      );
      await client.query("DELETE FROM societies WHERE id = ANY($1::uuid[])", [
        ids,
      ]);

      return { deleted: ids.length, slugs };
    });

    if (result.deleted === 0) {
      console.log("No test societies found.");
    } else {
      console.log(`Removed ${result.deleted} test societ(ies):`);
      for (const slug of result.slugs) {
        console.log(`  - ${slug}`);
      }
    }
  } finally {
    await pool.end();
  }
}

cleanTestData().catch((err) => {
  console.error("Clean test data failed:", err);
  process.exit(1);
});
