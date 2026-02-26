import { z } from "zod";

export const AiMatchSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["reject", "maybe", "strong_yes"]),
  reasoning: z.string().min(1),
  keySkills: z.array(z.string()),
});

export type AiMatch = z.infer<typeof AiMatchSchema>;