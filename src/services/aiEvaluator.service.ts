import { GoogleGenAI } from "@google/genai";
import { logger } from "../config/logger.js";
import { AiMatchSchema } from "../schemas/aiMatch.schema.js";
import fs from "fs/promises";
import path from "path";
import { CANDIDATE_PROFILE } from "../constants/candidateProfile.js";

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
    .replace(
      "{{TARGET_ROLES}}",
      CANDIDATE_PROFILE.targetRoles.join(", "),
    )
    .replace(
      "{{PREFERRED_SKILLS}}",
      CANDIDATE_PROFILE.preferredSkills.join(", "),
    )
    .replace("{{SENIORITY}}", CANDIDATE_PROFILE.seniority)
    .replace(
      "{{AVOID_KEYWORDS}}",
      CANDIDATE_PROFILE.avoidKeywords.join(", "),
    );
}

export async function evaluateJobWithAI(jobText: string) {
  try {
    const basePrompt = await getPrompt();

    // token safety
    const MAX_CHARS = 4000;
    const trimmedJob = jobText.slice(0, MAX_CHARS);

    // load base prompt from file
    const template = await getPrompt(); // your existing loader

    // inject candidate persona into template
    const fullPrompt = hydratePrompt(template) + `JOB DESCRIPTION: ${jobText.slice(0, 12000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const text = response.text;
    if (!text) return null;

    // strip fences
    const cleaned = extractJson(text);

    // parse JSON
    const parsed = JSON.parse(cleaned);

    // Zod validation
    const validated = AiMatchSchema.parse(parsed);

    return validated;
  } catch (err) {
    logger.error({ err }, "❌ AI evaluation failed");
    return null;
  }
}