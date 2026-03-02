// handles reading/writing AI evaluation cache

import { pool } from "../config/db.js";
import { hashContent } from "../utils/hash.js";

// check if we already evaluated similar content
export async function getCachedAiResult(text: string) {
  const hash = hashContent(text);

  const res = await pool.query(
    `SELECT score, verdict, reasoning, key_skills
     FROM ai_cache
     WHERE content_hash = $1`,
    [hash],
  );

  if (res.rowCount === 0) return null;

  const row = res.rows[0];

  return {
    score: row.score,
    verdict: row.verdict,
    reasoning: row.reasoning,
    keySkills:
      typeof row.key_skills === "string"
        ? JSON.parse(row.key_skills)
        : row.key_skills,
  };
}

// store fresh AI result
export async function storeAiCache(
  text: string,
  result: {
    score: number;
    verdict: string;
    reasoning: string;
    keySkills: string[];
  },
) {
  const hash = hashContent(text);

  await pool.query(
    `INSERT INTO ai_cache
     (content_hash, score, verdict, reasoning, key_skills)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (content_hash) DO NOTHING`,
    [
      hash,
      result.score,
      result.verdict,
      result.reasoning,
      JSON.stringify(result.keySkills),
    ],
  );
}
