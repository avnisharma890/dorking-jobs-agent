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

export async function evaluateJobWithAI(jobText: string) {
  try {
    const basePrompt = await getPrompt();

    // token safety
    const MAX_CHARS = 4000;
    const trimmedJob = jobText.slice(0, MAX_CHARS);

    const fullPrompt = `
        ${basePrompt}

        ${CANDIDATE_PROFILE}

        JOB DESCRIPTION:
        ${trimmedJob}
    `;

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