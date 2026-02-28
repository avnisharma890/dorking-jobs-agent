export interface CandidateProfile {
  targetRoles: string[];
  preferredSkills: string[];
  seniority: "intern" | "junior" | "mid";
  avoidKeywords: string[];
}

export const CANDIDATE_PROFILE: CandidateProfile = {
  targetRoles: [
    "backend intern",
    "ai intern",
    "machine learning intern",
    "genai intern",
  ],

  preferredSkills: [
    "node.js",
    "typescript",
    "express",
    "postgres",
    "redis",
    "python",
    "machine learning",
    "llm",
    "rag",
    "vector database",
  ],

  seniority: "intern",

  avoidKeywords: [
    "senior",
    "staff",
    "principal",
    "5+ years",
    "7+ years",
  ],
};