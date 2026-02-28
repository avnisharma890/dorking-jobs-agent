// lightweight semantic filter to reduce unnecessary AI calls
const STRONG_SIGNALS = [
  "backend",
  "api",
  "node",
  "python",
  "machine learning",
  "ai",
  "distributed",
  "data",
  "intern",
];

const NEGATIVE_SIGNALS = [
  "sales",
  "marketing",
  "hr",
  "recruiter",
  "finance",
  "accounting",
];

// quick heuristic relevance score
export function passesSemanticFilter(text: string): boolean {
  const lower = text.toLowerCase();

  let positiveHits = 0;
  let negativeHits = 0;

  for (const word of STRONG_SIGNALS) {
    if (lower.includes(word)) positiveHits++;
  }

  for (const word of NEGATIVE_SIGNALS) {
    if (lower.includes(word)) negativeHits++;
  }

  // must have signal and not be dominated by negatives
  return positiveHits >= 2 && negativeHits <= 1;
}