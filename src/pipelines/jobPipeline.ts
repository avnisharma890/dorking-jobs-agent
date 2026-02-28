import { scrapeJobPage } from "../services/scraper.service.js";
import { evaluateJobWithAI } from "../services/aiEvaluator.service.js";
import { insertEvaluatedJob, jobExists } from "../repositories/job.repository.js";
import { passesSemanticFilter } from "../utils/semanticFilter.js";
import { computeJobRank } from "../utils/jobRanker.js";
import { AI_THRESHOLDS } from "../config/aiThresholds.js";
import { logger } from "../config/logger.js";
import { link } from "node:fs";

// one-line: full evaluation pipeline for a single job
export async function processSingleJob(
  job: { title?: string; link: string },
  options: {
    maxChars: number;
    aiDelayMs: number;
  }
): Promise<"inserted" | "skipped" | "failed"> {
  // dedup guard
  if (await jobExists(job.link)) {
    logger.info({ url: job.link }, "🧠 Skipped (already in DB)");
    return "skipped";
  }

  const scraped = await scrapeJobPage(job);
  if (!scraped) return "failed";

  // semantic filter
  if (!passesSemanticFilter(scraped.descriptionText)) {
    logger.info({ url: scraped.url }, "🧠 Skipped by semantic filter");
    return "skipped";
  }

  const trimmed = scraped.descriptionText.slice(0, options.maxChars);

  const aiResult = await evaluateJobWithAI(trimmed);
  if (!aiResult) {
    logger.warn({ url: scraped.url }, "🤖 AI returned null");
    return "failed";
  }

  // threshold gate
  if (aiResult.score < AI_THRESHOLDS.MIN_SCORE) {
    logger.info(
      { url: scraped.url, score: aiResult.score },
      "📉 Below threshold"
    );
    return "skipped";
  }

  // compute ranking signal
  const priorityScore = computeJobRank(aiResult.score);

  // persist
  await insertEvaluatedJob({
    url: scraped.url,
    title: job.title,
    description: scraped.descriptionText,
    aiScore: aiResult.score,
    aiVerdict: aiResult.verdict,
    aiReasoning: aiResult.reasoning,
    aiKeySkills: aiResult.keySkills,
    priorityScore,
  });

  // rate protection
  await new Promise((r) => setTimeout(r, options.aiDelayMs));

  return "inserted";
}