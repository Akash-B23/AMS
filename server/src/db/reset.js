import "dotenv/config";
import { createPool } from "./pool.js";

async function reset() {
  const pool = createPool();
  try {
    await pool.query("DROP TABLE IF EXISTS users CASCADE");
    await pool.query("DROP TABLE IF EXISTS residents CASCADE");
    await pool.query("DROP TABLE IF EXISTS flats CASCADE");
    await pool.query("DROP TABLE IF EXISTS blocks CASCADE");
    await pool.query("DROP TABLE IF EXISTS societies CASCADE");
    await pool.query("DROP TABLE IF EXISTS schema_migrations CASCADE");
    await pool.query("DROP TYPE IF EXISTS user_role");
    await pool.query("DROP TYPE IF EXISTS resident_type");
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ams_app') THEN
          REVOKE ALL ON SCHEMA public FROM ams_app;
          DROP ROLE ams_app;
        END IF;
      END
      $$;
    `);
    console.log("Database reset complete.");
  } finally {
    await pool.end();
  }
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
