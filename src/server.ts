import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDbHealth } from "./config/db.js";
import { startDiscoveryCron } from "./cron/discovery.cron.js";
import { startDigestCron } from "./cron/digest.cron.js";

async function startServer() {
  // ensure DB is healthy before starting server
  await checkDbHealth();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });

  startDiscoveryCron(); // background job hunter
  startDigestCron(); // daily telegram digest
}

startServer().catch((err: Error) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});