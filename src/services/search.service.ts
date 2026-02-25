import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { SEARCH_QUERIES } from "../constants/searchQueries.js";

export interface DiscoveredJob {
  title: string;
  link: string;
  sourceQuery: string;
}

const SERP_API_URL = "https://serpapi.com/search.json";

// simple in-run dedup
function deduplicateByUrl(jobs: DiscoveredJob[]): DiscoveredJob[] {
  const seen = new Set<string>();
  const unique: DiscoveredJob[] = [];

  for (const job of jobs) {
    if (!seen.has(job.link)) {
      seen.add(job.link);
      unique.push(job);
    }
  }

  return unique;
}

export async function searchJobs(): Promise<DiscoveredJob[]> {
  if (!env.serpApiKey) {
    throw new Error("SERPAPI_KEY missing");
  }

  const results: DiscoveredJob[] = [];

  for (const queryConfig of SEARCH_QUERIES) {
    try {
      logger.debug({ query: queryConfig.query }, "Running dork");

      const response = await axios.get(SERP_API_URL, {
        params: {
          engine: "google",
          q: queryConfig.query,
          api_key: env.serpApiKey,
          num: 10,
        },
        timeout: 15000,
      });

      const organic = response.data?.organic_results ?? [];  // organic must always be an iterable 

      for (const item of organic) {
        if (!item.link) continue;

        results.push({
          title: item.title ?? "Unknown role",
          link: item.link,
          sourceQuery: queryConfig.name,
        });
      }
    } catch (err) {
      logger.error(
        { err, query: queryConfig.name },
        "Search query failed"
      );
    }
  }

  const unique = deduplicateByUrl(results);

  logger.info(
    {
      total: results.length,
      unique: unique.length,
    },
    "Search completed"
  );

  return unique;
}