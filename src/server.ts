import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
import { logger } from "./config/logger.ts";
import { checkDbHealth } from "./config/db.ts";

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