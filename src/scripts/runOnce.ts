import { searchJobs } from "../services/search.service.js";
import { scrapeJobPage } from "../services/scraper.service.js";
import { logger } from "../config/logger.js";
import { processSingleJob } from "../pipelines/jobPipeline.js";

// 🧠 Cheap lexical pre-filter (saves LLM quota)
function passesCheapFilter(text: string): boolean {
  const lower = text.toLowerCase();

  const signals = [
    "backend intern",
    "backend ai intern",
    "backend engineering intern",
    "ai intern",
    "ai engineering intern",
    "machine learning intern",
    "ml intern",
    "software engineer intern",
    "Applied AI Engineer",
  ];

  return signals.some((s) => lower.includes(s));
}

export async function runDiscoveryOnce() {
  async function main() {
    logger.info("🚀 Running discovery once...");

    const AI_DELAY_MS = 15000; // safe for ~5 RPM free tier
    const MAX_CHARS = 4000; // token safety for free tier

    // CONTROLLED TEST FIRST
    const testJob = {
      title: "Backend AI Intern",
      link: "https://example.com/gold-test",
    };

    const testScrape = await scrapeJobPage(testJob);
    console.log("TEST SCRAPE LENGTH:", testScrape?.descriptionText.length);

    // ⭐ ADD THIS BLOCK
    logger.info("🧪 Running controlled strong-match test...");

    const testResult = await processSingleJob(testJob, {
      maxChars: MAX_CHARS,
      aiDelayMs: AI_DELAY_MS,
    });

    logger.info({ testResult }, "🧪 Test job result");

    // Normal discovery
    const jobs = await searchJobs();

    let success = 0;
    let failed = 0;
    let skippedByFilter = 0;

    const SAMPLE_SIZE = 3;
    const sample = jobs.slice(0, SAMPLE_SIZE);

    console.log(
      `\nFound ${jobs.length} jobs. Scraping first ${SAMPLE_SIZE}...\n`,
    );

    for (const job of sample) {
      const result = await processSingleJob(job, {
        maxChars: MAX_CHARS,
        aiDelayMs: AI_DELAY_MS,
      });

      if (result === "inserted") success++;
      else if (result === "failed") failed++;
      else skippedByFilter++;
    }

    logger.info(
      {
        discovered: jobs.length,
        attempted: sample.length,
        success,
        failed,
        skippedByFilter,
      },
      "📊 Discovery summary",
    );

    logger.info({ attempted: sample.length }, "✅ Scraping batch completed");
  }

  main().catch((err) => {
    logger.error({ err }, "❌ runOnce failed");
    process.exit(1);
  });
}

// allow manual execution via `npm run discover`
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] === __filename;

// execute only when run directly (not when imported by cron)
if (isDirectRun) {
  runDiscoveryOnce().catch((err) => {
    logger.error({ err }, "❌ runOnce failed");
    process.exit(1);
  });
}
