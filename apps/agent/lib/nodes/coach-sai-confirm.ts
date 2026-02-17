/**
 * Coach_SAIConfirm node: HITL for SAI range (FR-016).
 * When Advisor needs SAI band in search, Coach asks user to confirm.
 * Interrupts until user calls POST /api/discovery/confirm-sai.
 * @see data-model.md, plan.md, contracts/api-discovery.md
 */
import { Command, interrupt } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import type { TuitionLiftStateType } from "../state";

export type CoachSAIConfirmConfig = {
  configurable?: {
    thread_id?: string;
    discovery_run_id?: string;
  };
};

const SAI_CONFIRM_MESSAGE =
  "Would you like us to use your SAI range for a more targeted search? This helps find need-based scholarships that match your financial profile. You can approve to include SAI bands, or decline to use only broad income tiers.";

/**
 * Coach_SAIConfirm: emits Coach message, interrupts for user confirmation.
 * Resume value (true/false) comes from POST /api/discovery/confirm-sai.
 */
export async function coachSAIConfirmNode(
  state: TuitionLiftStateType,
  config?: CoachSAIConfirmConfig
): Promise<Command> {
  const message = new HumanMessage({
    content: SAI_CONFIRM_MESSAGE,
  });

  const approved = interrupt({
    type: "sai_range_confirmation",
    message: SAI_CONFIRM_MESSAGE,
    threadId: config?.configurable?.thread_id,
  });

  return new Command({
    goto: "Advisor_Search",
    update: {
      messages: [message],
      sai_range_approved: approved === true,
      pending_sai_confirmation: false,
      last_active_node: "Coach_SAIConfirm",
    },
  });
}
