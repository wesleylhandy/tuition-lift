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
import { getSavedInstitutionNamesForUser } from "@repo/db";
import { searchBatch } from "../discovery/tavily-client";
import { deduplicate } from "../discovery/deduplicator";
import { queryDbFirstScholarships } from "../discovery/db-first-lookup";

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

    const userId = userProfile?.id;
    const savedInstitutionNames =
      userId != null
        ? await getSavedInstitutionNamesForUser(userId)
        : [];

    const profile = scrubPiiFromProfile({
      user_profile: userProfile ?? undefined,
      financial_profile: financialProfile ?? undefined,
      award_year: state.award_year ?? undefined,
      savedInstitutionNames: savedInstitutionNames.length > 0 ? savedInstitutionNames : undefined,
    });

    // US4 T034: DB-first lookup BEFORE external search — reduces API latency
    const dbResults = await queryDbFirstScholarships(
      profile,
      discoveryRunId
    );

    const meritFirst =
      state.sai_above_merit_threshold === true &&
      state.merit_filter_preference === "merit_only";
    const queries = await generateQueries(profile, { meritFirst });

    if (queries.length === 0) {
      return new Command({
        goto: "Advisor_Verify",
        update: {
          discovery_results: dbResults,
          last_active_node: "Advisor_Search",
        },
      });
    }

    // Explicit timeout for Tavily calls; prevents indefinite hang (fetch has no built-in limit)
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

      // US4 T035: Merge DB results with Tavily; de-duplicate by URL (DB takes precedence)
      const byUrl = new Map<string, DiscoveryResult>();
      for (const r of dbResults) {
        const url = r.url?.trim();
        if (url) byUrl.set(url, r);
      }
      for (const r of deduped) {
        const url = r.url?.trim();
        if (url && !byUrl.has(url)) {
          byUrl.set(url, {
            id: randomUUID(),
            discovery_run_id: discoveryRunId,
            title: r.title,
            url: r.url,
            trust_score: 0,
            need_match_score: 0,
            content: r.content || undefined,
          });
        }
      }
      const discoveryResults = Array.from(byUrl.values());

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
