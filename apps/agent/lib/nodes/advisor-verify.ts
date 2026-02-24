/**
 * Advisor_Verify node: score results, apply Trust Filter, hand off to Coach.
 * Constitution §10: .edu/.gov 2×, auto-fail fees, 0-100 scoring.
 * Reads discovery_run_id from config.configurable; attaches to each result.
 * US2: TrustScorer integration; exclude fee_check=fail; persist to scholarships.
 * US3: need_match_score from NeedMatchScorer; order by SAI alignment + trust_score.
 *
 * @see data-model.md, plan.md
 * @see LangGraph JS: Command for node-to-node handoff; config.configurable for run-scoped data
 */
import { Command } from "@langchain/langgraph";
import type { TuitionLiftStateType } from "../state";
import type { DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import { verify as verifyCycle } from "../discovery/cycle-verifier";
import { computeNeedMatchScore } from "../discovery/need-match-scorer";
import { scoreTrust, toScholarshipMetadata } from "../discovery/trust-scorer";
import { upsertScholarship } from "../discovery/scholarship-upsert";

/**
 * Infers categories from url and content. US1 (009): need_blind when .edu + merit, no need-based.
 * Research §7: .edu + merit signals → need_blind; private org + merit → merit; need signals → need_based.
 */
function inferCategories(url: string, content: string): string[] {
  const text = (content ?? "").toLowerCase();
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const isEdu = hostname.endsWith(".edu");

  const categories: string[] = [];
  const hasNeed =
    text.includes("need-based") ||
    text.includes("low income") ||
    text.includes("pell");
  const hasMerit =
    text.includes("merit") ||
    text.includes("academic achievement") ||
    text.includes("gpa") ||
    text.includes("sat") ||
    text.includes("act");

  if (hasNeed) categories.push("need_based");
  if (hasMerit) {
    if (isEdu && !hasNeed) categories.push("need_blind");
    else if (!hasNeed) categories.push("merit");
  }
  if (text.includes("minority") || text.includes("diversity"))
    categories.push("minority");
  if (
    text.includes("engineering") ||
    text.includes("stem") ||
    text.includes("major")
  )
    categories.push("field_specific");
  if (categories.length === 0) categories.push("other");
  return categories;
}

/** Derives merit_tag from primary category for Coach prioritization. */
function toMeritTag(
  categories: string[]
): "merit_only" | "need_blind" | "need_based" | undefined {
  const first = categories[0];
  if (first === "need_blind" || first === "merit")
    return first === "need_blind" ? "need_blind" : "merit_only";
  if (first === "need_based") return "need_based";
  return undefined;
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
  if (process.env.US4_SIMULATE_VERIFY_FAIL === "1") {
    throw new Error("US4 resumability test: simulated Verify failure");
  }
  try {
    const discoveryRunId = config?.configurable?.discovery_run_id ?? "";
    const rawResults = state.discovery_results ?? [];
    const financialProfile = state.financial_profile;
    const saiAbove = state.sai_above_merit_threshold === true;
    const meritOnly = state.merit_filter_preference === "merit_only";

    const verified: DiscoveryResult[] = [];
    for (const r of rawResults) {
      const runId = discoveryRunId || (r.discovery_run_id ?? "");

      const trustResult = await scoreTrust({
        url: r.url,
        title: r.title,
        content: r.content ?? "",
      });

      if (trustResult.fee_check === "fail") continue;

      const needMatchScore = computeNeedMatchScore(financialProfile ?? null, {
        title: r.title,
        content: r.content ?? "",
      });
      const cycleResult = verifyCycle({
        deadline: r.deadline ?? null,
        url: r.url,
      });

      const categories = inferCategories(r.url, r.content ?? "");
      const meritTag = toMeritTag(categories);

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
        merit_tag: meritTag,
        deadline: cycleResult.deadline ?? undefined,
        amount: r.amount ?? null,
      };

      verified.push(result);

      const metadata = toScholarshipMetadata(
        trustResult,
        r.url,
        (r.content ?? "").slice(0, 500),
        categories,
        cycleResult.verification_status,
        meritTag
      );
      await upsertScholarship(result, metadata);
    }

    let filtered = verified;
    if (saiAbove && meritOnly) {
      filtered = verified.filter((r) => {
        const cats = r.categories ?? [];
        if (cats.includes("need_based") && !cats.includes("merit") && !cats.includes("need_blind"))
          return false;
        return true;
      });
    }

    filtered.sort(
      (a, b) =>
        (b.need_match_score - a.need_match_score) ||
        (b.trust_score - a.trust_score)
    );

    return new Command({
      goto: "Coach_Prioritization",
      update: {
        discovery_results: filtered,
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
