import { AI_THRESHOLDS } from "../config/aiThresholds.js";

// Decide whether job is worth keeping
export function passesAIThreshold(score: number): boolean {
  return score >= AI_THRESHOLDS.MIN_SCORE;
}