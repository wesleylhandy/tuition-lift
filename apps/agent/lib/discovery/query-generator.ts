/**
 * QueryGenerator: transforms AnonymizedProfile into 3–5 distinct search queries via LLM.
 * Per FR-001, contracts §1: input is anonymized only; output 3–5 query strings.
 * Never receives or emits name, SSN, or raw SAI (Constitution §4).
 */
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import type { AnonymizedProfile } from "./schemas";

const QUERIES_SCHEMA = z.object({
  queries: z
    .array(z.string().min(1).describe("A distinct scholarship search query"))
    .min(3)
    .max(5)
    .describe("3–5 distinct search queries for scholarship discovery"),
});

type QueriesOutput = z.infer<typeof QUERIES_SCHEMA>;

function formatProfileForPrompt(profile: AnonymizedProfile): string {
  const parts: string[] = [];
  if (profile.gpa != null) parts.push(`GPA: ${profile.gpa.toFixed(2)}`);
  if (profile.major) parts.push(`Major: ${profile.major}`);
  if (profile.incomeBracket) parts.push(`Income bracket: ${profile.incomeBracket}`);
  if (profile.pellStatus != null) {
    parts.push(
      `Pell status: ${profile.pellStatus ? "Pell eligible" : "Not Pell eligible"}`
    );
  }
  if (profile.spikes?.length)
    parts.push(`Activities: ${profile.spikes.join(", ")}`);
  return parts.length > 0 ? parts.join("; ") : "No profile attributes available";
}

const PROMPT = `You are a scholarship search assistant. Generate 3–5 distinct search queries for finding scholarships.
Each query must be different (different angles: need-based, field-specific, Pell-eligible, merit, etc.).
Focus on 2025–2026 and 2026–2027 academic year scholarships.
Use only the anonymized profile attributes provided. Never include names, SSN, or specific dollar amounts.
Return exactly 3–5 query strings, one per search. Each query should be 5–15 words.`;

const MERIT_FIRST_HINT = `IMPORTANT: This user qualifies for merit-first discovery. Prioritize queries that include "merit-based", "need-blind", "academic achievement", and "scholarship for high achievers" angles.`;

/**
 * Generates 3–5 distinct scholarship search queries from anonymized profile.
 * When meritFirst is true (SAI above merit threshold), adds merit/need-blind query hints per contracts §2.
 */
export async function generateQueries(
  profile: AnonymizedProfile,
  options?: { meritFirst?: boolean }
): Promise<string[]> {
  const profileText = formatProfileForPrompt(profile);
  const meritHint =
    options?.meritFirst === true ? `\n\n${MERIT_FIRST_HINT}` : "";
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
  }).withStructuredOutput(QUERIES_SCHEMA, {
    name: "scholarship_queries",
    strict: true,
  });

  const result = (await llm.invoke([
    { role: "system", content: PROMPT },
    {
      role: "user",
      content: `Profile: ${profileText}${meritHint}\n\nGenerate 3–5 distinct scholarship search queries.`,
    },
  ])) as QueriesOutput;

  return result.queries;
}
