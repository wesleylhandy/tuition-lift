/**
 * Coach_Prioritization node: map discovery_results → active_milestones by ROI.
 * FR-011: prioritize by Lift relative to financial gap.
 * FR-012b: empty results → "No matches yet" message, explain why, suggest next steps.
 * US3 (T028): on error append error_log, route to SafeRecovery.
 *
 * @see data-model.md, plan.md
 * @see LangGraph JS: nodes return partial state or Command for dynamic routing
 */
import { Command } from "@langchain/langgraph";
import type { TuitionLiftStateType } from "../state";
import type { ActiveMilestone, DiscoveryResult } from "../schemas";
import { createErrorEntry } from "../error-log";
import { HumanMessage } from "@langchain/core/messages";

/** ROI proxy: trust_score + need_match_score (higher = better fit). */
function roiScore(r: DiscoveryResult): number {
  return r.trust_score * 0.5 + r.need_match_score * 0.5;
}

/** US1: Boost for merit/need_blind when SAI above threshold. Per contracts §4. */
const MERIT_BOOST = 50;

/**
 * Effective ROI for prioritization. US1: when sai_above_merit_threshold, boost
 * merit_only and need_blind so they rank in top 3 (SC-004).
 */
function effectiveRoiScore(
  r: DiscoveryResult,
  saiAboveThreshold: boolean
): number {
  const base = roiScore(r);
  if (!saiAboveThreshold) return base;
  if (r.merit_tag === "merit_only" || r.merit_tag === "need_blind")
    return base + MERIT_BOOST;
  return base;
}

/**
 * Coach_Prioritization: maps discovery_results to active_milestones, ROI-ordered.
 * US1: When sai_above_merit_threshold, sort merit/need_blind first; boost their score.
 * Empty or no merit results → alternative path message (trade schools, community colleges).
 */
export async function coachPrioritizationNode(
  state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType> | Command> {
  try {
    const results = state.discovery_results ?? [];
    const saiAbove = state.sai_above_merit_threshold === true;

    if (results.length === 0) {
      const content = saiAbove
        ? `No merit or need-blind matches yet. Merit results can be limited — consider exploring trade schools, community colleges, or expanding your search criteria.`
        : `No matches yet. This can happen when filters are narrow or financial info is limited. Try broadening your search (e.g., add more majors or interests), complete your financial profile if you haven't, or check back later — new scholarships are added regularly.`;
      return {
        active_milestones: [],
        messages: [new HumanMessage({ content })],
        last_active_node: "Coach_Prioritization",
      };
    }

    const sorted = [...results].sort(
      (a, b) => effectiveRoiScore(b, saiAbove) - effectiveRoiScore(a, saiAbove)
    );
    const hasMerit = sorted.some(
      (r) => r.merit_tag === "merit_only" || r.merit_tag === "need_blind"
    );
    const altPathMessage =
      saiAbove && !hasMerit
        ? new HumanMessage({
            content: `Merit results are limited for your profile. Consider trade schools, community colleges, or need-based options as alternative paths.`,
          })
        : null;

    const activeMilestones: ActiveMilestone[] = sorted.map((r, i) => ({
      id: `ms-${r.id}`,
      scholarship_id: r.id,
      title: r.title,
      priority: i + 1,
      status: "pending",
    }));

    const messages = altPathMessage ? [altPathMessage] : [];
    return {
      active_milestones: activeMilestones,
      messages,
      last_active_node: "Coach_Prioritization",
    };
  } catch (err) {
    return new Command({
      goto: "SafeRecovery",
      update: {
        error_log: [createErrorEntry("Coach_Prioritization", err)],
        last_active_node: "Coach_Prioritization",
      },
    });
  }
}
