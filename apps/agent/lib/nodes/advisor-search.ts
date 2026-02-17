/**
 * Advisor_Search node: web search using Tavily with anonymized financial context.
 * FR-006, FR-007, FR-007a: anonymized profile only; placeholders for geo.
 * Returns raw results in discovery_results (placeholder scores); Advisor_Verify scores them.
 * @see data-model.md, plan.md
 */
import { TavilySearch } from "@langchain/tavily";
import type { TuitionLiftStateType } from "../state.js";
import type { DiscoveryResult } from "../schemas.js";
import { anonymizeFinancial, GEO_PLACEHOLDERS } from "../anonymize-financial.js";
import { randomUUID } from "node:crypto";

export type AdvisorSearchConfig = {
  configurable?: {
    discovery_run_id?: string;
    thread_id?: string;
  };
};

/** Raw search result shape from Tavily API. */
interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

/**
 * Advisor_Search: performs Tavily web search with anonymized context.
 * Uses user_profile.major, financial_profile (anonymized), {{USER_STATE}}, {{USER_CITY}}.
 * Returns discovery_results with placeholder trust_score/need_match_score; Advisor_Verify scores them.
 */
export async function advisorSearchNode(
  state: TuitionLiftStateType,
  config?: AdvisorSearchConfig
): Promise<Partial<TuitionLiftStateType>> {
  const discoveryRunId =
    config?.configurable?.discovery_run_id ?? randomUUID();
  const userProfile = state.user_profile;
  const financialProfile = state.financial_profile;

  const major = userProfile?.major ?? "undecided";
  const anonymized = financialProfile
    ? anonymizeFinancial(financialProfile)
    : { household_income: "Unknown" as const, pell_status: "Unknown" as const };

  const query = [
    "scholarships",
    `for ${major} major`,
    `in ${GEO_PLACEHOLDERS.USER_STATE}`,
    anonymized.household_income,
    anonymized.pell_status,
    "need-based financial aid",
  ].join(" ");

  const tool = new TavilySearch({
    maxResults: 10,
    topic: "general",
    searchDepth: "basic",
  });

  const response = await tool.invoke({ query });
  const apiResponse = response as { results?: TavilyResult[] } | { error?: string };
  const results = "results" in apiResponse && Array.isArray(apiResponse.results)
    ? apiResponse.results
    : "error" in apiResponse
      ? []
      : [];

  const discoveryResults: DiscoveryResult[] = results.map((r, i) => ({
    id: randomUUID(),
    discovery_run_id: discoveryRunId,
    title: r.title ?? "Untitled",
    url: r.url ?? "",
    trust_score: 0,
    need_match_score: 0,
    content: r.content,
  }));

  return {
    discovery_results: discoveryResults,
    last_active_node: "Advisor_Search",
  };
}
