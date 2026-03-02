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

// fetch top jobs that were not yet included in a digest
export async function getTopUnsentJobs(limit: number) {
  const res = await pool.query(
    `
    SELECT *
    FROM jobs
    WHERE digest_sent = FALSE
    ORDER BY ai_score DESC, evaluated_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return res.rows;
}

// mark jobs as already pushed to digest
export async function markJobsAsDigested(urls: string[]) {
  if (!urls.length) return;

  await pool.query(
    `
    UPDATE jobs
    SET digest_sent = TRUE
    WHERE url = ANY($1::text[])
    `,
    [urls]
  );
}

// Fetch top ranked jobs for digest generation
export async function getTopJobs(limit: number = 10) {
  const res = await pool.query(
    `
    SELECT
      id,
      url,
      title,
      ai_score,
      ai_verdict,
      ai_reasoning,
      ai_key_skills,
      priority_score,
      evaluated_at
    FROM jobs
    WHERE digest_sent = false
      AND ai_verdict = 'strong_yes'
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
  priorityScore?: number;
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