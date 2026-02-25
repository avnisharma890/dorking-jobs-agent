export interface SearchQueryConfig {
  name: string;
  query: string;
  priority: number;
}

// discovery intelligence layer
export const SEARCH_QUERIES: SearchQueryConfig[] = [
  // Tier 1 — Structured job boards (HIGH SIGNAL)
  {
    name: "ashby_backend_intern",
    query: 'site:jobs.ashbyhq.com "backend intern"',
    priority: 1,
  },
  {
    name: "greenhouse_ai_intern",
    query: 'site:boards.greenhouse.io "AI intern"',
    priority: 1,
  },
  {
    name: "lever_ml_intern",
    query: 'site:jobs.lever.co "machine learning intern"',
    priority: 1,
  },

  // Tier 2 — Freshness hunting
  {
    name: "fresh_ai_intern",
    query: '"AI intern" "we are hiring"',
    priority: 2,
  },
  {
    name: "fresh_backend_intern",
    query: '"backend intern" "apply"',
    priority: 2,
  },

  // Tier 3 — startup long tail (LOW COMPETITION)
  {
    name: "startup_ai_intern",
    query: '"early stage startup" "AI intern"',
    priority: 3,
  },
];