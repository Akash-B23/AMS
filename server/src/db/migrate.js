import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");

function parseSqlStatements(contents) {
  const withoutLineComments = contents
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function runMigrations() {
  const pool = createPool();
  try {
    await ensureMigrationsTable(pool);

    const applied = await getAppliedMigrations(pool);
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const contents = await readFile(filePath, "utf8");
      const statements = parseSqlStatements(contents);

      console.log(`Applying ${file}...`);
      for (const statement of statements) {
        await pool.query(statement);
      }
      await pool.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file],
      );
      console.log(`Applied ${file}`);
    }

    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
