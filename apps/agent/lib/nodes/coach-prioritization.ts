/**
 * Coach_Prioritization node: map discovery_results → active_milestones by ROI.
 * FR-011: prioritize by Lift relative to financial gap.
 * FR-012b: empty results → "No matches yet" message, explain why, suggest next steps.
 * US3 (T028): on error append error_log, route to SafeRecovery.
 * @see data-model.md, plan.md
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

/**
 * Coach_Prioritization: maps discovery_results to active_milestones, ROI-ordered.
 * Empty results → Coach persona message (FR-012b).
 * US3: On error append error_log and route to SafeRecovery.
 */
export async function coachPrioritizationNode(
  state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType> | Command> {
  try {
    const results = state.discovery_results ?? [];

    if (results.length === 0) {
      const message = new HumanMessage({
        content: `No matches yet. This can happen when filters are narrow or financial info is limited. Try broadening your search (e.g., add more majors or interests), complete your financial profile if you haven't, or check back later — new scholarships are added regularly.`,
      });
      return {
        active_milestones: [],
        messages: [message],
        last_active_node: "Coach_Prioritization",
      };
    }

    const sorted = [...results].sort((a, b) => roiScore(b) - roiScore(a));
    const activeMilestones: ActiveMilestone[] = sorted.map((r, i) => ({
      id: `ms-${r.id}`,
      scholarship_id: r.id,
      title: r.title,
      priority: i + 1,
      status: "pending",
    }));

    return {
      active_milestones: activeMilestones,
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
