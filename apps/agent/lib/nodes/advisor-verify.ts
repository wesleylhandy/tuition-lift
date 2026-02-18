/**
 * Advisor_Verify node: score results, apply Trust Filter, hand off to Coach.
 * Constitution §10: .edu/.gov 2×, auto-fail fees, 0-100 scoring.
 * Reads discovery_run_id from config.configurable; attaches to each result.
 * US2: TrustScorer integration; exclude fee_check=fail; persist to scholarships.
 *
 * @see data-model.md, plan.md
 * @see LangGraph JS: Command for node-to-node handoff; config.configurable for run-scoped data
 */
import { Command } from "@langchain/langgraph";
import type { TuitionLiftStateType } from "../state";
import type { DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import { anonymizeFinancial } from "../anonymize-financial";
import { verify as verifyCycle } from "../discovery/cycle-verifier";
import { scoreTrust, toScholarshipMetadata } from "../discovery/trust-scorer";
import { upsertScholarship } from "../discovery/scholarship-upsert";

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

/** Infer categories from content for metadata; US3 extends with SAI alignment. */
function inferCategories(content: string): string[] {
  const text = (content ?? "").toLowerCase();
  const categories: string[] = [];
  if (text.includes("need-based") || text.includes("low income") || text.includes("pell"))
    categories.push("need_based");
  if (text.includes("merit")) categories.push("merit");
  if (text.includes("minority") || text.includes("diversity")) categories.push("minority");
  if (text.includes("engineering") || text.includes("stem") || text.includes("major"))
    categories.push("field_specific");
  if (categories.length === 0) categories.push("other");
  return categories;
}

export type AdvisorVerifyConfig = {
  configurable?: {
    discovery_run_id?: string;
    thread_id?: string;
  };
};

/**
 * Advisor_Verify: TrustScorer + CycleVerifier; exclude fee_check=fail; persist via ScholarshipUpsert.
 * US2: Every result has trust_score, trust_report; fee-required excluded from active.
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
      const runId = discoveryRunId || (r.discovery_run_id ?? "");

      const trustResult = await scoreTrust({
        url: r.url,
        title: r.title,
        content: r.content ?? "",
      });

      if (trustResult.fee_check === "fail") continue;

      const needMatchScore = computeNeedMatchScore(r.content ?? "", anonymized);
      const cycleResult = verifyCycle({
        deadline: r.deadline ?? null,
        url: r.url,
      });

      const categories = inferCategories(r.content ?? "");

      const result: DiscoveryResult = {
        id: r.id,
        discovery_run_id: runId,
        title: r.title,
        url: r.url,
        trust_score: trustResult.trust_score,
        need_match_score: needMatchScore,
        trust_report: trustResult.trust_report,
        verification_status: cycleResult.verification_status,
        categories,
        deadline: cycleResult.deadline ?? undefined,
        amount: r.amount ?? null,
      };

      verified.push(result);

      const metadata = toScholarshipMetadata(
        trustResult,
        r.url,
        (r.content ?? "").slice(0, 500),
        categories,
        cycleResult.verification_status
      );
      await upsertScholarship(result, metadata);
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
