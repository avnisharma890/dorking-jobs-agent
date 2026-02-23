import { searchJobs } from "../src/services/search.service.ts";
import { logger } from "../src/config/logger.ts";

async function main() {
  logger.info("Running discovery once...");

  const jobs = await searchJobs();

  console.log("\n=== DISCOVERED JOBS ===");
  for (const job of jobs) {
    console.log(`${job.title}`);
    console.log(`${job.link}`);
    console.log("----");
  }
}

main().catch((err) => {
  logger.error({ err }, "runOnce failed");
  process.exit(1);
});