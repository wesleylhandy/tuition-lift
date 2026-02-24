/**
 * Coach_Major_Pivot node (US3): Undecided students receive major/school suggestions.
 * Maps profile (spikes, interests) to CIP/major categories; suggests majors and schools
 * from career_outcomes and institutions.
 *
 * @see spec.md User Story 3, contracts/agent-discovery.md
 */
import { Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

import type { TuitionLiftStateType } from "../state";
import type { UserProfile } from "../schemas";
import {
  getCareerOutcomesByInterest,
  getInstitutionsForRecommendation,
} from "@repo/db";
import { createErrorEntry } from "../error-log";

const INTEREST_KEYWORDS_SCHEMA = z.object({
  keywords: z
    .array(z.string().min(1))
    .max(8)
    .describe("2–8 interest/strength keywords for major matching (e.g., technology, healthcare, leadership)"),
});

type InterestKeywords = z.infer<typeof INTEREST_KEYWORDS_SCHEMA>;

const PERSONALITY_PROMPT = `You are an encouraging Coach helping an undecided student explore majors.
Given their profile (activities/spikes, state), infer 2–8 interest keywords that could map to college majors or career paths.
Examples: "Water Polo" → athletics, sports, teamwork; "Leadership" → business, management; "Robotics" → engineering, technology.
Return only the keywords array—short, lowercase, actionable for major matching.`;

const PERSONALITY_QUESTIONS_INTRO =
  "A few questions to reflect on: Do you prefer working with people or with data? Hands-on projects or research and analysis? Fixing things or creating something new? ";

async function inferInterestKeywords(
  profile: UserProfile | undefined
): Promise<string[]> {
  const spikes = profile?.spikes ?? [];
  const state = profile?.state ?? "";
  const parts: string[] = [];
  if (spikes.length) parts.push(`Activities: ${spikes.join(", ")}`);
  if (state) parts.push(`State: ${state}`);

  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.4,
  }).withStructuredOutput(INTEREST_KEYWORDS_SCHEMA, {
    name: "interest_keywords",
    strict: true,
  });

  try {
    const out = (await llm.invoke([
      { role: "system", content: PERSONALITY_PROMPT },
      {
        role: "user",
        content:
          parts.length > 0
            ? `Profile: ${parts.join("; ")}`
            : "No profile details yet—suggest broadly appealing options.",
      },
    ])) as InterestKeywords;
    return out.keywords;
  } catch {
    return ["business", "technology", "healthcare"];
  }
}

function formatRecommendation(
  majors: Array<{ major_name: string; career_path: string | null; mean_annual_wage: number | null }>,
  schools: Array<{ name: string; institution_type: string; state: string | null }>
): string {
  const majorLines = majors
    .slice(0, 6)
    .map(
      (m) =>
        `• **${m.major_name}**${m.career_path ? ` → ${m.career_path}` : ""}${m.mean_annual_wage ? ` (year-5 income ~$${Math.round(m.mean_annual_wage).toLocaleString()})` : ""}`
    )
    .join("\n");

  const schoolLines = schools
    .slice(0, 5)
    .map((s) => `• **${s.name}** (${s.institution_type.replace(/_/g, " ")})${s.state ? ` – ${s.state}` : ""}`)
    .join("\n");

  let msg =
    "You're exploring—that's great! " +
    PERSONALITY_QUESTIONS_INTRO +
    "Based on what we know about you so far, here are some majors and schools to consider:\n\n";
  if (majorLines) msg += "**Majors aligned with you:**\n" + majorLines + "\n\n";
  if (schoolLines) msg += "**Schools to consider:**\n" + schoolLines;
  if (!majorLines && !schoolLines) msg += "We're still building our catalog—complete your profile with interests or activities to get better suggestions!";
  return msg;
}

/**
 * Coach_Major_Pivot: infers interests from profile, fetches majors/schools, returns Coach message.
 */
export async function coachMajorPivotNode(
  state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType> | Command> {
  try {
    const profile = state.user_profile;
    const keywords = await inferInterestKeywords(profile);
    const [majors, schools] = await Promise.all([
      getCareerOutcomesByInterest(keywords),
      getInstitutionsForRecommendation(profile?.state ?? null),
    ]);

    const content = formatRecommendation(majors, schools);
    return {
      messages: [new HumanMessage({ content })],
      active_milestones: [],
      discovery_results: [],
      last_active_node: "Coach_Major_Pivot",
    };
  } catch (err) {
    return new Command({
      goto: "SafeRecovery",
      update: {
        error_log: [createErrorEntry("Coach_Major_Pivot", err)],
        last_active_node: "Coach_Major_Pivot",
      },
    });
  }
}
