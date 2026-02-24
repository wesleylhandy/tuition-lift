/**
 * Advisor_Search node: privacy-safe scholarship search via QueryGenerator, Tavily, Deduplicator.
 * Per T016: load profile, scrub PII, 3–5 queries, rate-limited Tavily, dedupe, write raw results.
 * No PII leaves system (FR-002, FR-003). Zero results → empty discovery_results (T031).
 * Tavily timeout/failure → error_log, route to SafeRecovery (T032).
 */
import { Command } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";

import type { TuitionLiftStateType } from "../state";
import type { DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import { scrubPiiFromProfile } from "../discovery/pii-scrub";
import { generateQueries } from "../discovery/query-generator";
import { searchBatch } from "../discovery/tavily-client";
import { deduplicate } from "../discovery/deduplicator";

export type AdvisorSearchConfig = {
  configurable?: {
    discovery_run_id?: string;
    thread_id?: string;
    useSaiRange?: boolean;
  };
};

/**
 * Extracts unique domains from result URLs for Live Pulse (006).
 */
function extractDomainsFromResults(
  results: Array<{ url: string }>
): string[] {
  const domains = new Set<string>();
  for (const r of results) {
    try {
      const u = new URL(r.url);
      domains.add(u.hostname.replace(/^www\./, ""));
    } catch {
      // skip invalid URLs
    }
  }
  return Array.from(domains);
}

/**
 * Advisor_Search: QueryGenerator → Tavily (rate-limited) → Deduplicator → state.
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

    // US2: SAI confirmation gate — defer to Coach before using SAI bands
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

    const profile = scrubPiiFromProfile({
      user_profile: userProfile ?? undefined,
      financial_profile: financialProfile ?? undefined,
    });

    const meritFirst =
      state.sai_above_merit_threshold === true &&
      state.merit_filter_preference === "merit_only";
    const queries = await generateQueries(profile, { meritFirst });
    if (queries.length === 0) {
      return new Command({
        goto: "Advisor_Verify",
        update: {
          discovery_results: [],
          last_active_node: "Advisor_Search",
        },
      });
    }

    // T032: Explicit timeout for Tavily calls; prevents indefinite hang (fetch has no built-in limit)
    const timeoutMs =
      parseInt(process.env.DISCOVERY_SEARCH_TIMEOUT_MS ?? "300000", 10) || 300000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const batchResults = await searchBatch(queries, {
        signal: controller.signal,
      });
      const rawResults = batchResults.flat();
      const deduped = deduplicate(rawResults);

      // T031: When Tavily returns empty or no results, set discovery_results: [] and goto Advisor_Verify (no error)
      if (deduped.length === 0) {
        return new Command({
          goto: "Advisor_Verify",
          update: {
            discovery_results: [],
            last_active_node: "Advisor_Search",
          },
        });
      }

      const discoveryResults: DiscoveryResult[] = deduped.map((r) => ({
        id: randomUUID(),
        discovery_run_id: discoveryRunId,
        title: r.title,
        url: r.url,
        trust_score: 0,
        need_match_score: 0,
        content: r.content || undefined,
      }));

      // Domains extracted for Live Pulse (006)
      void extractDomainsFromResults(deduped);

      return new Command({
        goto: "Advisor_Verify",
        update: {
          discovery_results: discoveryResults,
          last_active_node: "Advisor_Search",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
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
