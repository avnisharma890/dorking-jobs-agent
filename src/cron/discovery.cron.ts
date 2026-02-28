import cron from "node-cron";
import { runDiscoveryOnce } from "../scripts/runOnce.js"

let isRunning = false;

// Run discovery every 2 hours safely without overlap
export function startDiscoveryCron() {
  cron.schedule("0 */2 * * *", async () => {
    if (isRunning) { 
      console.log("⏭️ Previous discovery still running — skipping");
      return;
    }

    isRunning = true;
    console.log("⏰ Running scheduled discovery");

    try {
      await runDiscoveryOnce();
    } catch (err) {
      console.error("❌ Cron discovery failed", err);
    } finally {
      isRunning = false;
    }
  });
}