import { getTopJobs } from "../repositories/job.repository.js";
import { logger } from "../config/logger.js";

// Build human-readable daily digest from top ranked jobs
export async function buildDailyDigest(limit: number = 10) {
  try {
    const jobs = await getTopJobs(limit);

    if (!jobs.length) {
      logger.info("📭 No jobs available for digest");
      return "No strong matches found today.";
    }

    const lines: string[] = [];

    lines.push("🔥 Top AI/Backend Intern Matches\n");

    jobs.forEach((job, index) => {
      lines.push(
        `${index + 1}. ${job.title ?? "Untitled Role"}`
      );
      lines.push(`🔗 ${job.url}`);
      lines.push(`⭐ Score: ${job.ai_score}`);
      lines.push(`🧠 Verdict: ${job.ai_verdict}`);
      lines.push("");
    });

    const digest = lines.join("\n");

    logger.info(
      { count: jobs.length },
      "📬 Daily digest generated"
    );

    return digest;
  } catch (err) {
    logger.error({ err }, "❌ Digest generation failed");
    return null;
  }
}