import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../config/logger.js";

export interface ScrapedJob {
  url: string;
  title: string;
  descriptionText: string;
  rawHtmlLength: number;
}

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

// --- helper: sleep ---
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- helper: fetch with retry ---
async function fetchWithRetry(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AI-Internship-Agent/1.0)",
        },
        maxRedirects: 5,
      });

      return response.data as string;
    } catch (err) {
      lastError = err;

      logger.warn(
        { url, attempt },
        "⚠️ Fetch failed, retrying if attempts remain"
      );

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * (attempt + 1)); // simple backoff
      }
    }
  }

  throw lastError;
}

// --- helper: extract readable text ---
function extractReadableText(html: string): string {
  const $ = cheerio.load(html);

  // remove noise
  $("script, style, noscript, iframe").remove();

  // get body text
  const text = $("body").text();

  // normalize whitespace
  return text.replace(/\s+/g, " ").trim();
}

// --- main scraper ---
export async function scrapeJobPage(
  input: { title?: string; link: string }
): Promise<ScrapedJob | null> {
  try {
    logger.trace?.({ url: input.link }, "🕷️ Scraping job page");

    const html = await fetchWithRetry(input.link);

    const cleanedText = extractReadableText(html);

    logger.debug(
      { url: input.link, textLength: cleanedText.length },
      "📏 Extracted text length"
    );

    // guard against garbage pages
    if (!cleanedText || cleanedText.length < 500) {
      logger.warn(
        { url: input.link },
        "⚠️ Extracted text too small, skipping"
      );
      return null;
    }

    return {
      url: input.link,
      title: input.title ?? "Untitled Job",
      descriptionText: cleanedText.slice(0, 15000), // protect LLM context
      rawHtmlLength: html.length,
    };
  } catch (err) {

    logger.error(
    {
        url: input.link,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        message: err instanceof Error ? err.message : String(err),
    },
        "❌ Scraping failed"
    );
    return null;
  }
}