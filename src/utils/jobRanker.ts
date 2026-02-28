// compute final priority score for a job
export function computeJobRank(score: number): number {
  // one-line: weighted score normalization for consistent ordering
  const normalized = Math.min(Math.max(score, 0), 100);

  // future-safe weighting (easy to extend later)
  const FINAL_WEIGHT = 1.0;

  return Math.round(normalized * FINAL_WEIGHT);
}