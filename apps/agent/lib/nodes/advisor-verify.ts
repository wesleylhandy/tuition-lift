/**
 * Advisor_Verify node: score results, apply Trust Filter, hand off to Coach.
 * Constitution §10: .edu/.gov 2×, auto-fail fees, 0-100 scoring.
 * Reads discovery_run_id from config.configurable; attaches to each result.
 * US3 (T028): on error append error_log, route to SafeRecovery.
 * @see data-model.md, plan.md
 */
import { Command } from "@langchain/langgraph";
import type { TuitionLiftStateType } from "../state";
import type { DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import { anonymizeFinancial } from "../anonymize-financial";

const FEE_PATTERNS = [
  /application fee/i,
  /processing fee/i,
  /guarantee fee/i,
  /upfront fee/i,
  /\$[\d,]+\s*(?:application|processing|to apply)/i,
];

function suggestsUpfrontFee(title: string, content: string): boolean {
  const text = `${title} ${content}`;
  return FEE_PATTERNS.some((p) => p.test(text));
}

/** Trust Filter: Constitution §10 — .edu/.gov High Trust 80-100, .com/.org 60-79, auto-fail = 0. */
function computeTrustScore(url: string, title: string, content: string): number {
  if (suggestsUpfrontFee(title, content)) return 0;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".edu")) return 90;
    if (host.endsWith(".gov")) return 90;
    if (host.endsWith(".org")) return 68;
    return 62;
  } catch {
    return 50;
  }
}

/** need_match_score: match vs financial_profile (0-100). */
function computeNeedMatchScore(
  content: string,
  anonymized: { household_income: string; pell_status: string }
): number {
  let score = 50;
  const text = (content ?? "").toLowerCase();
  const ctx = `${anonymized.household_income} ${anonymized.pell_status}`.toLowerCase();
  if (ctx.includes("low") && (text.includes("need-based") || text.includes("low income")))
    score += 25;
  if (ctx.includes("pell") && text.includes("pell")) score += 20;
  if (text.includes("merit") && !ctx.includes("low")) score += 5;
  return Math.min(100, Math.max(0, score));
}

export type AdvisorVerifyConfig = {
  configurable?: {
    discovery_run_id?: string;
    thread_id?: string;
  };
};

/**
 * Advisor_Verify: scores discovery_results, applies Trust Filter, returns Command to Coach.
 * US3: On error append error_log and route to SafeRecovery.
 */
export async function advisorVerifyNode(
  state: TuitionLiftStateType,
  config?: AdvisorVerifyConfig
): Promise<Command> {
  try {
    const discoveryRunId = config?.configurable?.discovery_run_id ?? "";
    const rawResults = state.discovery_results ?? [];
    const financialProfile = state.financial_profile;
    const anonymized = financialProfile
      ? anonymizeFinancial(financialProfile)
      : { household_income: "Unknown", pell_status: "Unknown" };

    const verified: DiscoveryResult[] = [];
    for (const r of rawResults) {
      const runId = discoveryRunId || r.discovery_run_id;
      const trustScore = computeTrustScore(
        r.url,
        r.title,
        r.content ?? ""
      );
      if (trustScore === 0) continue;

      const needMatchScore = computeNeedMatchScore(r.content ?? "", anonymized);

      verified.push({
        id: r.id,
        discovery_run_id: runId,
        title: r.title,
        url: r.url,
        trust_score: trustScore,
        need_match_score: needMatchScore,
      });
    }

    return new Command({
      goto: "Coach_Prioritization",
      update: {
        discovery_results: verified,
        last_active_node: "Advisor_Verify",
      },
    });
  } catch (err) {
    return new Command({
      goto: "SafeRecovery",
      update: {
        error_log: [createErrorEntry("Advisor_Verify", err)],
        last_active_node: "Advisor_Verify",
      },
    });
  }
}
