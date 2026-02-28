// compute recency bonus so newer jobs rank higher
function computeFreshnessBoost(evaluatedAt?: Date): number {
  if (!evaluatedAt) return 0;

  const ageHours =
    (Date.now() - new Date(evaluatedAt).getTime()) / (1000 * 60 * 60);

  if (ageHours < 24) return 10;
  if (ageHours < 72) return 5;
  if (ageHours < 168) return 2;
  return 0;
}

// compute final priority score for a job (AI score + freshness)
export function computeJobRank(
  score: number,
  evaluatedAt?: Date,
): number {
  // normalize AI score to [0,100]
  const normalized = Math.min(Math.max(score, 0), 100);

  // add freshness boost (safe if date missing)
  const boosted = normalized + computeFreshnessBoost(evaluatedAt);

  // future-safe weighting hook
  const FINAL_WEIGHT = 1.0;

  return Math.round(boosted * FINAL_WEIGHT);
}