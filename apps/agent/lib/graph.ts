/**
 * TuitionLift orchestration graph.
 * FR-003: Advisor_Search and Advisor_Verify are separate nodes; checkpoint between them.
 * US2 (T027): Coach_SAIConfirm HITL node; Advisor_Search can goto Coach_SAIConfirm or Advisor_Verify.
 * US3 (T030): Advisor_Search, Advisor_Verify, Coach_Prioritization can goto SafeRecovery on error.
 * @see plan.md, data-model.md
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { TuitionLiftState } from "./state";
import { advisorSearchNode } from "./nodes/advisor-search";
import { advisorVerifyNode } from "./nodes/advisor-verify";
import { coachPrioritizationNode } from "./nodes/coach-prioritization";
import { coachSAIConfirmNode } from "./nodes/coach-sai-confirm";
import { safeRecoveryNode } from "./nodes/safe-recovery";

async function wrapSearch(
  state: Parameters<typeof advisorSearchNode>[0],
  config?: Parameters<typeof advisorSearchNode>[1]
) {
  return advisorSearchNode(state, config);
}

async function wrapVerify(
  state: Parameters<typeof advisorVerifyNode>[0],
  config?: Parameters<typeof advisorVerifyNode>[1]
) {
  return advisorVerifyNode(state, config);
}

async function wrapSafeRecovery(
  state: Parameters<typeof safeRecoveryNode>[0],
  config?: Parameters<typeof safeRecoveryNode>[1]
) {
  return safeRecoveryNode(state, config);
}

const builder = new StateGraph(TuitionLiftState)
  .addNode("Advisor_Search", wrapSearch, {
    ends: ["Advisor_Verify", "Coach_SAIConfirm", "SafeRecovery"],
  })
  .addNode("Advisor_Verify", wrapVerify, {
    ends: ["Coach_Prioritization", "SafeRecovery"],
  })
  .addNode("Coach_Prioritization", coachPrioritizationNode, {
    ends: ["SafeRecovery"],
  })
  .addNode("Coach_SAIConfirm", coachSAIConfirmNode, {
    ends: ["Advisor_Search"],
  })
  .addNode("SafeRecovery", wrapSafeRecovery)
  .addEdge(START, "Advisor_Search")
  .addEdge("Advisor_Verify", "Coach_Prioritization")
  .addEdge("Coach_Prioritization", END)
  .addEdge("SafeRecovery", END);

export const graph = builder.compile({ checkpointer });
