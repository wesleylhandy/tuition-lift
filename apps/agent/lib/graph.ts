/**
 * TuitionLift orchestration graph.
 * FR-003: Advisor_Search and Advisor_Verify are separate nodes; checkpoint between them.
 * @see plan.md, data-model.md
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer.js";
import { TuitionLiftState } from "./state.js";
import { advisorSearchNode } from "./nodes/advisor-search.js";
import { advisorVerifyNode } from "./nodes/advisor-verify.js";
import { coachPrioritizationNode } from "./nodes/coach-prioritization.js";
import { safeRecoveryPlaceholder } from "./nodes/safe-recovery.js";

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

const builder = new StateGraph(TuitionLiftState)
  .addNode("Advisor_Search", wrapSearch)
  .addNode("Advisor_Verify", wrapVerify)
  .addNode("Coach_Prioritization", coachPrioritizationNode)
  .addNode("SafeRecovery", safeRecoveryPlaceholder)
  .addEdge(START, "Advisor_Search")
  .addEdge("Advisor_Search", "Advisor_Verify")
  .addEdge("Advisor_Verify", "Coach_Prioritization")
  .addEdge("Coach_Prioritization", END);

export const graph = builder.compile({ checkpointer });
