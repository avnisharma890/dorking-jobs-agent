import cron from "node-cron";
import { buildDailyDigest } from "../services/digest.service.js";
import { sendTelegramDigest } from "../services/telegram.service.js";
import { logger } from "../config/logger.js";

// run daily digest on schedule and push to Telegram
export function startDigestCron() {
  // ✅ INIT LOG (runs immediately on server start)
  logger.info("🧭 Digest cron initialized");

  // 🕘 runs every day at 9 AM
  cron.schedule("0 9 * * *", async () => {
    // ✅ EXECUTION LOG (runs when cron fires)
    logger.info("📨 Running daily digest");
    try {
      const digest = await buildDailyDigest(10);
      if (!digest) return;
      await sendTelegramDigest(digest);
    } catch (err) {
      logger.error({ err }, "❌ Digest cron failed");
    }
  });
}