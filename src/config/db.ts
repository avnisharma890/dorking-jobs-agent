import { Pool } from "pg";
import { env } from "./env.ts";
import { logger } from "./logger.ts";

// Create Postgres pool
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log when a new client connects
pool.on("connect", () => {
  logger.debug("Postgres client connected to pool");
});

// Log pool-level errors
pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});


// Health check function
export async function checkDbHealth(): Promise<void> {
  try {
    const client = await pool.connect();

    try {
      await client.query("SELECT 1");
      logger.info("Postgres health check passed");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.fatal({ err }, "Postgres health check failed");
    throw err; // crash fast — good for containers
  }
}