/**
 * SafeRecovery node: Coach persona notifies user of error; transitions to END.
 * T029: Add Coach message, update discovery_completions status=failed.
 * @see data-model.md, plan.md
 */
import { HumanMessage } from "@langchain/core/messages";
import { createDbClient } from "@repo/db";
import type { TuitionLiftStateType } from "../state";

export type SafeRecoveryConfig = {
  configurable?: {
    thread_id?: string;
    discovery_run_id?: string;
  };
};

const COACH_ERROR_MESSAGE =
  "Something went wrong while processing your discovery. Our team has been notified. Please try again in a few minutes, or reach out if the issue persists.";

/**
 * SafeRecovery: Coach persona message notifying user; updates discovery_completions to failed; transitions to END.
 */
export async function safeRecoveryNode(
  state: TuitionLiftStateType,
  config?: SafeRecoveryConfig
): Promise<Partial<TuitionLiftStateType>> {
  const message = new HumanMessage({
    content: COACH_ERROR_MESSAGE,
  });

  const discoveryRunId = config?.configurable?.discovery_run_id;
  if (discoveryRunId) {
    try {
      const db = createDbClient();
      await db
        .from("discovery_completions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("discovery_run_id", discoveryRunId);
    } catch {
      // Non-fatal: state update and message still applied; completion status may be stale
    }
  }

  return {
    messages: [message],
    last_active_node: "SafeRecovery",
  };
}
