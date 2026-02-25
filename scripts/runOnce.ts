import { searchJobs } from "../src/services/search.service";
import { scrapeJobPage } from "../src/services/scraper.service";
import { logger } from "../src/config/logger";

async function main() {
  logger.info("🚀 Running discovery once...");

  const jobs = await searchJobs();

  let success = 0;
  let failed = 0;

  console.log(`\nFound ${jobs.length} jobs. Scraping first 3...\n`);

  for (const job of jobs.slice(0, 3)) {
    const scraped = await scrapeJobPage(job);

    if (!scraped) {
      failed++;
      continue;
    }

    success++;

    console.log("\n✅ SCRAPED:");
    console.log(scraped.url);
    console.log("Text length:", scraped.descriptionText.length);
    console.log("----");
  }

  logger.info(
    {
      discovered: jobs.length,
      attempted: Math.min(3, jobs.length),
      success,
      failed,
    },
    "📊 Discovery summary",
  );

  logger.info(
    { attempted: jobs.slice(0, 3).length },
    "✅ Scraping batch completed",
  );
}

main().catch((err) => {
  logger.error({ err }, "❌ runOnce failed");
  process.exit(1);
});
