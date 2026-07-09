import { createPool } from "./pool.js";

let pool;

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * Run queries inside a transaction with RLS session variables set.
 * @param {{ societyId?: string, isPlatformSuperadmin?: boolean }} context
 * @param {(client: import("@neondatabase/serverless").PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withDbContext(
  { societyId, isPlatformSuperadmin = false },
  fn,
) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE ams_app");
    if (isPlatformSuperadmin) {
      await client.query(
        `SELECT set_config('app.is_platform_superadmin', 'true', true)`,
      );
    }
    if (societyId) {
      await client.query(`SELECT set_config('app.society_id', $1, true)`, [
        societyId,
      ]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run pool-based queries (seed scripts) with platform superadmin bypass.
 * @param {import("@neondatabase/serverless").Pool} seedPool
 * @param {(client: import("@neondatabase/serverless").PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withPoolBypass(seedPool, fn) {
  const client = await seedPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `SELECT set_config('app.is_platform_superadmin', 'true', true)`,
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
