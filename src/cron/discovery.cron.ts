import cron from "node-cron";
import { runDiscoveryOnce } from "../scripts/runOnce.js"

// Run discovery every 2 hours
export function startDiscoveryCron() {
  cron.schedule("0 */2 * * *", async () => {
    console.log("⏰ Running scheduled discovery");

    try {
      await runDiscoveryOnce();
    } catch (err) {
      console.error("❌ Cron discovery failed", err);
    }
  });
}