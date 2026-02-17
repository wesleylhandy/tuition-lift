/**
 * TuitionLift orchestration graph.
 * FR-003: Advisor_Search and Advisor_Verify are separate nodes; checkpoint between them.
 * Placeholder nodes until T011–T013, T028–T030 implement full logic.
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import type { TuitionLiftStateType } from "./state.js";
import { checkpointer } from "./checkpointer.js";
import { TuitionLiftState } from "./state.js";

/** Placeholder: T011 implements web search with anonymized context. */
async function advisorSearchPlaceholder(
  _state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  return { last_active_node: "Advisor_Search" };
}

/** Placeholder: T012 implements Trust Filter, scoring; returns Command. */
async function advisorVerifyPlaceholder(
  _state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  return { last_active_node: "Advisor_Verify" };
}

/** Placeholder: T013 implements ROI ordering; maps discovery_results → active_milestones. */
async function coachPrioritizationPlaceholder(
  _state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  return { last_active_node: "Coach_Prioritization" };
}

/** Placeholder: T029 implements Coach persona error notification; transitions to END. */
async function safeRecoveryPlaceholder(
  _state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  return { last_active_node: "SafeRecovery" };
}

const builder = new StateGraph(TuitionLiftState)
  .addNode("Advisor_Search", advisorSearchPlaceholder)
  .addNode("Advisor_Verify", advisorVerifyPlaceholder)
  .addNode("Coach_Prioritization", coachPrioritizationPlaceholder)
  .addNode("SafeRecovery", safeRecoveryPlaceholder)
  .addEdge(START, "Advisor_Search")
  .addEdge("Advisor_Search", "Advisor_Verify")
  .addEdge("Advisor_Verify", "Coach_Prioritization")
  .addEdge("Coach_Prioritization", END);

export const graph = builder.compile({ checkpointer });
