import { pool } from "../config/db.js";
import { computeJobRank } from "../utils/jobRanker.js";

// Check if job already exists (dedup guard)
export async function jobExists(url: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM jobs WHERE url = $1 LIMIT 1`,
    [url]
  );
  return (res.rowCount ?? 0) > 0;
}

// Fetch top ranked jobs for digest generation
export async function getTopJobs(limit: number = 10) {
  const res = await pool.query(
    `
    SELECT
      url,
      title,
      ai_score,
      ai_verdict,
      ai_reasoning,
      ai_key_skills,
      priority_score,
      evaluated_at
    FROM jobs
    ORDER BY priority_score DESC, evaluated_at DESC
    LIMIT $1
    `,
    [limit],
  );

  return res.rows;
}

// Persist evaluated job
export async function insertEvaluatedJob(data: {
  url: string;
  title?: string;
  description: string;
  aiScore: number;
  aiVerdict: string;
  aiReasoning: string;
  aiKeySkills: string[];
}) {
  // compute final priority score for ranking
  const priorityScore = computeJobRank(data.aiScore);

  await pool.query(
    `
    INSERT INTO jobs (
      url,
      title,
      description,
      ai_score,
      ai_verdict,
      ai_reasoning,
      ai_key_skills,
      priority_score,
      evaluated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT (url) DO NOTHING
    `,
    [
      data.url,
      data.title ?? null,
      data.description,
      data.aiScore,
      data.aiVerdict,
      data.aiReasoning,
      data.aiKeySkills,
      priorityScore,
    ]
  );
}