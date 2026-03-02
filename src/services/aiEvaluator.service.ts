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
export function extractJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }

  return text.slice(firstBrace, lastBrace + 1);
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

function normalizeAiKeys(obj: any) {
  return {
    score: obj.score,
    verdict:
      typeof obj.verdict === "string"
        ? obj.verdict
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/\s+/g, " ")
            .trim()
        : obj.verdict,
    reasoning: obj.reasoning,
    keySkills: Array.isArray(obj.keySkills) ? obj.keySkills : [],

    // normalize variants
    location: obj.location ?? null,

    stipend: obj.stipend ?? obj.stipend_or_pay ?? obj["stipend or pay"] ?? null,

    eligibility:
      obj.eligibility ??
      obj.eligibility_year_requirements ??
      obj["eligibility year/requirements"] ??
      null,

    deadline:
      obj.deadline ??
      obj.application_deadline ??
      obj["application deadline"] ??
      null,
  };
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
      logger.info("🟡 Entered rate limiter task"); // DEBUG: confirms limiter actually runs

      let response;

      // STAGE 1: Gemini call
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: finalPrompt }],
            },
          ],
        });
        logger.debug("🧠 Gemini call succeeded");

        console.log(JSON.stringify(response, null, 2));
      } catch (err) {
        logger.error({ err }, "🚨 Gemini call failed");
        return null;
      }

      logger.debug(
        {
          hasText: !!response.text,
          candidates: response.candidates?.length,
        },
        "🧪 Gemini response shape",
      ); // DEBUG: confirms model returned usable payload

      // STAGE 2: Extract text
      const text =
        response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        logger.error({ response }, "🚨 Gemini returned empty text");
        return null;
      }

      logger.debug({ preview: text.slice(0, 200) }, "🧪 Gemini text extracted");

      // STAGE 3: Extract JSON
      let cleaned;
      try {
        cleaned = extractJson(text);

        logger.debug(
          { cleanedPreview: cleaned.slice(0, 200) },
          "🧪 JSON extracted",
        );

        logger.info({ textLength: text.length }, "🧪 Extracted text length"); // DEBUG: ensures we actually got content
      } catch (err) {
        logger.error({ text }, "🚨 JSON extraction failed");
        return null;
      }

      // STAGE 4: Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(cleaned);

        logger.info({ parsed }, "🧪 PARSED JSON"); // DEBUG: confirms parse worked
      } catch (err) {
        logger.error({ cleaned }, "🚨 JSON.parse failed");
        return null;
      }

      // STAGE 5: Normalize + validate
      const normalized = normalizeAiKeys(parsed);

      logger.info({ normalized }, "🧪 NORMALIZED JSON"); // DEBUG: check verdict formatting etc

      let validated;
      try {
        logger.info("🧪 About to run Zod"); // DEBUG: checkpoint before validation

        validated = AiMatchSchema.parse(normalized);

        logger.info("✅ Zod passed"); // DEBUG: proves validation succeeded
      } catch (zerr) {
        logger.error(
          { normalized, zodError: zerr },
          "🚨 ZOD VALIDATION FAILED",
        );
        return null;
      }

      // SUCCESS
      logger.debug("✅ AI evaluation succeeded");

      await storeAiCache(trimmedJob, validated);

      logger.info("💾 Cached AI result"); // DEBUG: ensure cache didn't throw

      logger.info("✅ Returning validated object"); // DEBUG: last line inside limiter

      return validated;
    });

    logger.info({ result }, "🧪 Rate limiter returned");

    return result ?? null;
  } catch (err) {
    logger.error({ err }, "❌ AI evaluation failed");
    return null;
  }
}
