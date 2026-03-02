# AI Internship Discovery Agent - Architecture & Data Flow

## High-Level Architecture

┌────────────────────────────┐
│        Scheduler            │  (node-cron)
│  - Discovery: every 2h     │
│  - Digest: daily @ 9AM     │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    Search Service           │
│ (SerpAPI Google Dorks)      │
│ - Lever/Greenhouse/Ashby   │
│ - Fresh startup queries     │
└─────────────┬──────────────┘
              │ job URLs
              ▼
┌────────────────────────────┐
│     Scraper Service         │
│ - Axios + Cheerio (fallback)│
│ - Puppeteer (JS-heavy)      │
│ - Retry logic + cleanup     │
└─────────────┬──────────────┘
              │ structured job
              ▼
┌────────────────────────────┐
│   Job Pipeline Service     │
│ - Deduplication check       │
│ - Semantic pre-filter       │
│ - AI evaluation            │
│ - Threshold gating          │
│ - Priority ranking          │
└─────────────┬──────────────┘
              │ scored job
              ▼
┌────────────────────────────┐
│      AI Evaluation Service  │
│  (Gemini 2.5 Flash)         │
│  - Relevance score (0-1)    │
│  - Verdict (strong_yes/no)  │
│  - Reasoning                │
│  - Key skills extraction    │
│  - Location/Stipend info   │
│  - AI rate limiting         │
│  - Result caching           │
└─────────────┬──────────────┘
              │ evaluated job
              ▼
┌────────────────────────────┐
│   Database Layer           │
│ (PostgreSQL)               │
│ - Jobs table               │
│ - Users table (future)     │
│ - Resumes table (future)   │
│ - digest_sent flag         │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│      Digest Service        │
│ - Top unsent jobs query    │
│ - Human-readable formatting│
│ - Mark as sent             │
└─────────────┬──────────────┘
              │ digest
              ▼
┌────────────────────────────┐
│   Notification Service      │
│     (Telegram Bot)          │
│ - Daily digest delivery    │
│ - User-specific digests    │
└────────────────────────────┘

## Detailed Data Flow

### 1. Discovery Pipeline (Every 2 Hours)

**Trigger**: `discovery.cron.ts` → `runDiscoveryOnce()`

```
Search Queries (SEARCH_QUERIES)
    ↓
SerpAPI Google Dorks
    ↓
Job URLs Array (title, link, sourceQuery)
    ↓
In-memory Deduplication
    ↓
Sample Processing (configurable SAMPLE_SIZE)
```

**Search Query Tiers**:
- **Tier 1**: Lever/Greenhouse (high-yield structured boards)
- **Tier 2**: AshbyHQ (medium reliability)
- **Tier 3**: Fresh queries ("we are hiring" + keywords)
- **Tier 4**: Startup long tail ("early stage startup")

### 2. Scraping Pipeline (Per Job)

**Entry Point**: `processSingleJob()` in `jobPipeline.ts`

```
Job URL
    ↓
Deduplication Check (jobExists in DB)
    ↓
Scraper Service (scrapeJobPage)
    ├── Axios + Cheerio (primary)
    ├── Puppeteer (JS-heavy fallback) [FUTURE]
    └── Retry logic (max 2 retries)
    ↓
Content Validation (> 500 chars)
    ↓
Structured Job Object
    ├── url
    ├── title
    ├── descriptionText (max 15k chars)
    └── rawHtmlLength
```

### 3. AI Evaluation Pipeline

**Pre-filtering**:
```typescript
// Semantic filter in passesSemanticFilter()
const signals = [
  "backend intern", "ai intern", "machine learning intern",
  "software engineer intern", "Applied AI Engineer"
];
```

**AI Processing**:
```
Trimmed Job Description (max 4k chars)
    ↓
Cache Check (getCachedAiResult)
    ↓
Rate Limiter (15s delay for ~5 RPM)
    ↓
Gemini 2.5 Flash API
    ↓
JSON Response Parsing
    ↓
Zod Schema Validation (AiMatchSchema)
    ↓
Normalized Result
    ├── score: number (0-1)
    ├── verdict: "strong_yes" | "no" | "maybe"
    ├── reasoning: string
    ├── keySkills: string[]
    ├── location?: string
    ├── stipend?: string
    └── eligibility?: string
```

**Threshold Gating**:
```typescript
if (aiResult.score < AI_THRESHOLDS.MIN_SCORE) {
  return "skipped"; // Below 0.7 by default
}
```

### 4. Database Persistence

**Jobs Table Schema**:
```sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  ai_score DECIMAL(3,2),
  ai_verdict VARCHAR(20),
  ai_reasoning TEXT,
  ai_key_skills TEXT[],
  priority_score DECIMAL(5,2),
  digest_sent BOOLEAN DEFAULT FALSE,
  evaluated_at TIMESTAMP DEFAULT NOW()
);
```

**Priority Ranking**: `computeJobRank(aiScore)` - combines AI score with recency

### 5. Digest Pipeline (Daily @ 9AM)

**Trigger**: `digest.cron.ts` → `buildDailyDigest()`

```
Database Query (getTopUnsentJobs)
    ↓
ORDER BY ai_score DESC, evaluated_at DESC
    ↓
Format Digest (human-readable)
    ├── Job title + URL
    ├── AI score + verdict
    ├── Location/Stipend/Deadline (if available)
    └── Key skills extracted
    ↓
Telegram Delivery (sendTelegramDigest)
    ↓
Mark Jobs as Sent (markJobsAsDigested)
```

## Configuration & Constants

### AI Thresholds (`aiThresholds.ts`)
```typescript
export const AI_THRESHOLDS = {
  MIN_SCORE: 0.7,        // Minimum relevance score
  MAX_CHARS: 4000,       // Max chars sent to AI
  AI_DELAY_MS: 15000,    // Rate limiting delay
};
```

### Candidate Profile (`candidateProfile.ts`)
```typescript
export const CANDIDATE_PROFILE = {
  targetRoles: ["backend intern", "ai intern", "machine learning intern"],
  preferredSkills: ["node.js", "typescript", "python", "llm", "rag"],
  seniority: "intern",
  avoidKeywords: ["senior", "staff", "5+ years"],
};
```

### Search Queries (`searchQueries.ts`)
- 10 total queries across 4 tiers
- Priority-based ordering
- Structured board targeting (Lever, Greenhouse, Ashby)

## Error Handling & Resilience

### Retry Logic
- **Scraper**: 2 retries with exponential backoff
- **AI Calls**: Rate limiting + cache fallback
- **Database**: Connection pooling + health checks

### Logging Strategy
- **Pino logger** with structured context
- **Debug levels**: trace, debug, info, warn, error, fatal
- **Key events**: Discovery start/end, AI calls, DB operations

### Graceful Degradation
- **Scraper failure**: Continue with next job
- **AI failure**: Skip job, log error
- **DB failure**: Crash fast (container-friendly)

## Performance Optimizations

### Caching Layer
- **AI results cached** by job description hash
- **Avoids redundant API calls** for similar job postings

### Rate Limiting
- **AI calls**: 15-second delay (~5 RPM for free tier)
- **Database**: Connection pooling (max 10 connections)
- **HTTP requests**: 15-second timeout

### Batch Processing
- **Configurable sample sizes** for testing
- **In-memory deduplication** before DB operations
- **Pre-filtering** to reduce AI API usage

## Future Enhancements (Planned)

### 1. Puppeteer Integration
- Handle JavaScript-heavy job boards
- Better content extraction for dynamic pages
- Screenshot capability for debugging

### 2. Resume Parsing & Personalization
- **User profiles table** with preferences
- **Resume upload** and AI-based skill extraction
- **Personalized job matching** based on user skills
- **Multi-user digest delivery**

### 3. Enhanced AI Features
- **Skill gap analysis** (resume vs job requirements)
- **Interview preparation** suggestions
- **Salary insights** and market data

### 4. Monitoring & Analytics
- **Success metrics** (applications per digest)
- **Source effectiveness** tracking
- **AI accuracy** measurement

## Development Workflow

### Scripts
```bash
npm run dev      # Development server with cron jobs
npm run discover # Run discovery once manually
npm run digest   # Test digest generation
npm run build    # TypeScript compilation
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
SERPAPI_KEY=...
GEMINI_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

This architecture provides a solid foundation for scaling to multiple users and adding advanced personalization features while maintaining robust error handling and performance optimization.