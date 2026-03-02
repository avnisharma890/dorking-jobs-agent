import { logger } from "../config/logger.js";
import { sendTelegramDigest } from "./telegram.service.js";
import {
  getTopJobs,
  getTopUnsentJobs,
  markJobsAsDigested,
} from "../repositories/job.repository.js";

// Build human-readable daily digest from top ranked jobs
export async function buildDailyDigest(limit: number = 10) {
  try {
    const jobs = await getTopUnsentJobs(limit);

    if (!jobs.length) {
      logger.info("📭 No jobs available for digest");
      return "No strong matches found today.";
    }

    const lines: string[] = [];

    lines.push("🔥 Top AI/Backend Intern Matches");
    lines.push("");

    jobs.forEach((job, index) => {
      lines.push(`${index + 1}. ${job.title ?? "Untitled Role"}`);
      lines.push(`🔗 ${job.url}`);
      lines.push(`⭐ Score: ${job.ai_score}`);
      lines.push(`🧠 Verdict: ${job.ai_verdict}`);

      // ✅ Optional enrichments (safe guards)
      if (job.location) {
        lines.push(`📍 Location: ${job.location}`);
      }

      if (job.stipend) {
        lines.push(`💰 Stipend: ${job.stipend}`);
      }

      if (job.deadline) {
        const formatted =
          job.deadline instanceof Date
            ? job.deadline.toISOString().slice(0, 10)
            : job.deadline;

        lines.push(`⏳ Deadline: ${formatted}`);
      }

      lines.push("");
    });

    const digest = lines.join("\n");

    // push digest to telegram subscriber
    await sendTelegramDigest(digest);

    logger.info({ count: jobs.length }, "📬 Daily digest generated");

    // mark these jobs so we don't resend them
    await markJobsAsDigested(jobs.map(j => j.url));
    return digest;
  } catch (err) {
    logger.error({ err }, "❌ Digest generation failed");
    return null;
  }
}