import { z } from "zod";

export const AiMatchSchema = z.object({
  score: z.number().min(0).max(100),

  verdict: z.enum(["reject", "maybe", "strong_yes"]),

  reasoning: z.string().min(1),

  keySkills: z.array(z.string()),

  location: z.string().nullable().optional(),

  stipend: z
    .string()
    .nullable()
    .optional()
    .or(z.object({}).passthrough().optional()),

  eligibility: z.string().nullable().optional(),

  deadline: z.string().nullable().optional(),
}).transform((data: any) => ({
  ...data,
  stipend:
    data.stipend ??
    data.stipend_or_pay ??
    null,

  eligibility:
    data.eligibility ??
    data.eligibility_year_requirements ??
    null,

  deadline:
    data.deadline ??
    data.application_deadline ??
    null,
}));

export type AiMatch = z.infer<typeof AiMatchSchema>;
