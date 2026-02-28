import { searchJobs } from "../services/search.service.js";
import { scrapeJobPage } from "../services/scraper.service.js";
import { logger } from "../config/logger.js";
import { evaluateJobWithAI } from "../services/aiEvaluator.service.js";
import {
  jobExists,
  insertEvaluatedJob,
} from "../repositories/job.repository.js";
import { AI_THRESHOLDS } from "../config/aiThresholds.js";

// 🧠 Cheap lexical pre-filter (saves LLM quota)
function passesCheapFilter(text: string): boolean {
  const lower = text.toLowerCase();

  const signals = [
    "backend intern",
    "ai intern",
    "machine learning intern",
    "software engineer intern",
    "ml intern",
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
      title: "Backend Intern Test",
      link: "https://jobs.lever.co/convergentresearch/4f276075-e670-4f93-aa47-f89c78272b97",
    };

    const testScrape = await scrapeJobPage(testJob);
    console.log("TEST SCRAPE LENGTH:", testScrape?.descriptionText.length);

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
      // skip if already processed in previous runs
      if (await jobExists(job.link)) {
        logger.info({ url: job.link }, "🧠 Skipped (already in DB)");
        continue;
      }
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

      // CHEAP FILTER STAGE
      if (!passesCheapFilter(scraped.descriptionText)) {
        skippedByFilter++;
        logger.info({ url: scraped.url }, "🚫 Skipped by cheap filter");
        continue;
      }

      // Token trimming (VERY IMPORTANT)
      const trimmedText = scraped.descriptionText.slice(0, MAX_CHARS);

      // AI evaluation
      const aiResult = await evaluateJobWithAI(trimmedText);

      // skip if AI failed or returned invalid
      if (!aiResult) {
        logger.warn({ url: scraped.url }, "🤖 AI returned null");
        continue;
      }

      console.log("AI RESULT:", aiResult);

      // threshold filter
      if (aiResult.score < AI_THRESHOLDS.MIN_SCORE) {
        logger.info(
          { url: scraped.url, score: aiResult.score },
          "📉 Below threshold",
        );
        continue;
      }

      // persist high-quality job to DB
      await insertEvaluatedJob({
        url: scraped.url,
        title: job.title,
        description: scraped.descriptionText,
        aiScore: aiResult.score,
        aiVerdict: aiResult.verdict,
        aiReasoning: aiResult.reasoning,
        aiKeySkills: aiResult.keySkills,
      });

      // Rate limit protection
      await new Promise((r) => setTimeout(r, AI_DELAY_MS));
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