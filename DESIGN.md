***HIGH-LEVEL ARCHITECTURE***

┌────────────────────────────┐
│        Scheduler            │  (node-cron)
│  (runs every X hours)       │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    Search Service           │
│ (SerpAPI Google Dorks)      │
└─────────────┬──────────────┘
              │ job URLs
              ▼
┌────────────────────────────┐
│     Scraper Service         │
│ (fetch + extract JD)        │
└─────────────┬──────────────┘
              │ structured job
              ▼
┌────────────────────────────┐
│      AI Evaluation Service  │
│  (LLM semantic filtering)   │
│  - relevance score          │
│  - reasoning                │
│  - seniority check          │
└─────────────┬──────────────┘
              │ scored job
              ▼
┌────────────────────────────┐
│   Deduplication Layer       │
│ (DB unique URL check)       │
└─────────────┬──────────────┘
              │ new matches
              ▼
┌────────────────────────────┐
│   Notification Service      │
│     (Telegram bot)          │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│        Database             │
│        (Postgres)           │
└────────────────────────────┘