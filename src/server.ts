import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDbHealth } from "./config/db.js";

async function startServer() {
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

// await checkDbHealth();

startServer().catch((err: Error) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});