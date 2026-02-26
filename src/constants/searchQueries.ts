export interface SearchQueryConfig {
  name: string;
  query: string;
  priority: number;
}

// discovery intelligence layer
export const SEARCH_QUERIES: SearchQueryConfig[] = [
  // ================================
  // Tier 1 — HIGH-YIELD STRUCTURED BOARDS
  // (bias toward static HTML pages)
  // ================================

  {
    name: "lever_backend_intern",
    query: 'site:jobs.lever.co "backend intern"',
    priority: 1,
  },
  {
    name: "lever_ai_intern",
    query: 'site:jobs.lever.co "AI intern"',
    priority: 1,
  },
  {
    name: "lever_ml_intern",
    query: 'site:jobs.lever.co "machine learning intern"',
    priority: 1,
  },
  {
    name: "greenhouse_backend_intern",
    query: 'site:boards.greenhouse.io "backend intern"',
    priority: 1,
  },
  {
    name: "greenhouse_ai_intern",
    query: 'site:boards.greenhouse.io "AI intern"',
    priority: 1,
  },

  // ================================
  // Tier 2 — ASHBY (keep but de-emphasize)
  // ================================

  {
    name: "ashby_backend_intern",
    query: 'site:jobs.ashbyhq.com "backend intern"',
    priority: 2,
  },
  {
    name: "ashby_ai_intern",
    query: 'site:jobs.ashbyhq.com "AI intern"',
    priority: 2,
  },

  // ================================
  // Tier 3 — Freshness hunting
  // ================================

  {
    name: "fresh_ai_intern",
    query: '"AI intern" "we are hiring"',
    priority: 3,
  },
  {
    name: "fresh_backend_intern",
    query: '"backend intern" "apply"',
    priority: 3,
  },

  // ================================
  // Tier 4 — startup long tail
  // ================================

  {
    name: "startup_ai_intern",
    query: '"early stage startup" "AI intern"',
    priority: 4,
  },
];