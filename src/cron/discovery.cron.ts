import cron from "node-cron";
import { runDiscoveryOnce } from "../scripts/runOnce.js"
import { logger } from "../config/logger.js";

let isRunning = false; // prevents overlapping cron runs

// Run discovery every 2 hours safely without overlap
export function startDiscoveryCron() {
  cron.schedule("0 */2 * * *", async () => {
    if (isRunning) { 
      logger.warn("⏭️ Discovery skipped — previous run still active");
      return;
    }

    isRunning = true;
    logger.info("⏰ Running scheduled discovery");

    try {
      await runDiscoveryOnce();
    } catch (err) {
      console.error("❌ Cron discovery failed", err);
    } finally {
      isRunning = false;
    }
  });
}