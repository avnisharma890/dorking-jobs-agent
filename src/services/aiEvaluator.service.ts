import { GoogleGenAI } from "@google/genai";
import { logger } from "../config/logger.js";
import { AiMatchSchema } from "../schemas/aiMatch.schema.js";
import { CANDIDATE_PROFILE } from "../constants/candidateProfile.js";
import { aiRateLimiter } from "../utils/aiRateLimiter.js";
import { getCachedAiResult, storeAiCache } from "./aiCache.service.js";
import fs from "fs/promises";
import path from "path";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// robust fence stripper
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

// load prompt
async function getPrompt(): Promise<string> {
  const promptPath = path.join(process.cwd(), "prompts", "jobMatch.prompt.txt");

  return fs.readFile(promptPath, "utf-8");
}

// inject candidate persona into prompt template
function hydratePrompt(template: string): string {
  return template
    .replace("{{TARGET_ROLES}}", CANDIDATE_PROFILE.targetRoles.join(", "))
    .replace(
      "{{PREFERRED_SKILLS}}",
      CANDIDATE_PROFILE.preferredSkills.join(", "),
    )
    .replace("{{SENIORITY}}", CANDIDATE_PROFILE.seniority)
    .replace("{{AVOID_KEYWORDS}}", CANDIDATE_PROFILE.avoidKeywords.join(", "));
}

export async function evaluateJobWithAI(jobText: string) {
  try {
    // token safety
    const MAX_CHARS = 4000;
    const trimmedJob = jobText.slice(0, MAX_CHARS);

    // load prompt template once
    const template = await getPrompt();

    // inject candidate persona
    const finalPrompt =
      hydratePrompt(template) + `\n\nJOB DESCRIPTION:\n${trimmedJob}`;

    // check cache first to avoid wasting quota
    const cached = await getCachedAiResult(trimmedJob);
    if (cached) {
      logger.info("⚡ AI cache hit");
      return cached;
    }

    // route AI call through limiter to avoid quota bursts
    const result = await aiRateLimiter.schedule(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: finalPrompt,
      });

      const text = response.text;
      if (!text) return null;

      // strip fences
      const cleaned = extractJson(text);

      // parse JSON
      const parsed = JSON.parse(cleaned);

      // validate with zod
      const validated = AiMatchSchema.parse(parsed);

      // store for future reuse
      await storeAiCache(trimmedJob, validated);

      return validated;
    });

    return result ?? null;
  } catch (err) {
    logger.error({ err }, "❌ AI evaluation failed");
    return null;
  }
}