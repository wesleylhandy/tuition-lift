/**
 * Advisor_Search node: web search using Tavily with anonymized financial context.
 * FR-006, FR-007, FR-007a: anonymized profile only; placeholders for geo.
 * US2 (T026): if sai_range_approved, include SAI band in query; else income tiers only.
 * US2 (T024): when useSaiRange and SAI present and not yet confirmed, transition to Coach_SAIConfirm.
 * US3 (T028): on error append error_log, route to SafeRecovery.
 *
 * @see data-model.md, plan.md
 * @see LangGraph JS: Command({ goto, update }) for dynamic node transitions
 */
import { Command } from "@langchain/langgraph";
import { TavilySearch } from "@langchain/tavily";
import type { TuitionLiftStateType } from "../state";
import type { DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import {
  anonymizeFinancial,
  buildSearchQuery,
  assertNoRawPiiInSearchQuery,
  saiToBandString,
} from "../anonymize-financial";
import { randomUUID } from "node:crypto";

export type AdvisorSearchConfig = {
  configurable?: {
    discovery_run_id?: string;
    thread_id?: string;
    useSaiRange?: boolean;
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
 * US2: If useSaiRange and SAI present but not confirmed, transitions to Coach_SAIConfirm.
 * US2: If sai_range_approved, includes SAI band in query; else income tiers only.
 * US3: On error append error_log and route to SafeRecovery.
 */
export async function advisorSearchNode(
  state: TuitionLiftStateType,
  config?: AdvisorSearchConfig
): Promise<Partial<TuitionLiftStateType> | Command> {
  try {
    const discoveryRunId =
      config?.configurable?.discovery_run_id ?? randomUUID();
    const useSaiRange = config?.configurable?.useSaiRange ?? false;
    const userProfile = state.user_profile;
    const financialProfile = state.financial_profile;
    const saiRangeApproved = state.sai_range_approved;

    if (
      useSaiRange &&
      financialProfile &&
      typeof financialProfile.estimated_sai === "number" &&
      saiRangeApproved === undefined
    ) {
      return new Command({
        goto: "Coach_SAIConfirm",
        update: {
          pending_sai_confirmation: true,
          last_active_node: "Advisor_Search",
        },
      });
    }

    const major = userProfile?.major ?? "undecided";
    const anonymized = financialProfile
      ? anonymizeFinancial(financialProfile)
      : { household_income: "Unknown" as const, pell_status: "Unknown" as const };

    const incomeContext =
      saiRangeApproved === true &&
      financialProfile &&
      typeof financialProfile.estimated_sai === "number"
        ? `SAI ${saiToBandString(financialProfile.estimated_sai)}`
        : anonymized.household_income;

    const query = buildSearchQuery({
      major,
      incomeContext,
      pellStatus: anonymized.pell_status,
    });

    assertNoRawPiiInSearchQuery(query, financialProfile ?? null);

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

    const discoveryResults: DiscoveryResult[] = results.map((r) => ({
      id: randomUUID(),
      discovery_run_id: discoveryRunId,
      title: r.title ?? "Untitled",
      url: r.url ?? "",
      trust_score: 0,
      need_match_score: 0,
      content: r.content,
    }));

    return new Command({
      goto: "Advisor_Verify",
      update: {
        discovery_results: discoveryResults,
        last_active_node: "Advisor_Search",
      },
    });
  } catch (err) {
    return new Command({
      goto: "SafeRecovery",
      update: {
        error_log: [createErrorEntry("Advisor_Search", err)],
        last_active_node: "Advisor_Search",
      },
    });
  }
}
