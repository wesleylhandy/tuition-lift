/**
 * TuitionLift orchestration graph.
 * FR-003: Advisor_Search and Advisor_Verify are separate nodes; checkpoint between them.
 * US2 (T027): Coach_SAIConfirm HITL node; Advisor_Search can goto Coach_SAIConfirm or Advisor_Verify.
 * @see plan.md, data-model.md
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { TuitionLiftState } from "./state";
import { advisorSearchNode } from "./nodes/advisor-search";
import { advisorVerifyNode } from "./nodes/advisor-verify";
import { coachPrioritizationNode } from "./nodes/coach-prioritization";
import { coachSAIConfirmNode } from "./nodes/coach-sai-confirm";

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
  .addNode("Advisor_Search", wrapSearch, {
    ends: ["Advisor_Verify", "Coach_SAIConfirm"],
  })
  .addNode("Advisor_Verify", wrapVerify, { ends: ["Coach_Prioritization"] })
  .addNode("Coach_Prioritization", coachPrioritizationNode)
  .addNode("Coach_SAIConfirm", coachSAIConfirmNode, {
    ends: ["Advisor_Search"],
  })
  .addEdge(START, "Advisor_Search")
  .addEdge("Advisor_Verify", "Coach_Prioritization")
  .addEdge("Coach_Prioritization", END);

export const graph = builder.compile({ checkpointer });
