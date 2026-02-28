import cron from "node-cron";
import { buildDailyDigest } from "../services/digest.service.js";
import { logger } from "../config/logger.js";

// run daily digest at 9 AM IST
export function startDigestCron() {
  cron.schedule("0 9 * * *", async () => {
    logger.info("📨 Running daily digest");

    try {
      await buildDailyDigest(10);
    } catch (err) {
      logger.error({ err }, "❌ Digest cron failed");
    }
  });
}