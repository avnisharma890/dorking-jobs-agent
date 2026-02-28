import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDbHealth } from "./config/db.js";
import { startDiscoveryCron } from "./cron/discovery.cron.js";

async function startServer() {
  // ensure DB is healthy before starting server
  await checkDbHealth();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });

  // start background job hunter after server is ready
  startDiscoveryCron();
}

startServer().catch((err: Error) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});