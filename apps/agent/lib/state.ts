/**
 * TuitionLiftState — LangGraph state schema.
 * Per data-model.md §1; persisted via checkpoints.
 * Reducers: overwrite for scalar/object fields; append for messages and error_log.
 */
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import type {
  ActiveMilestone,
  DiscoveryResult,
  ErrorLogEntry,
  FinancialProfile,
  UserProfile,
} from "./schemas.js";

/**
 * Canonical node names — last_active_node value set by each node on transition.
 * @see data-model.md §7
 */
export const NODE_NAMES = [
  "Advisor_Search",
  "Advisor_Verify",
  "Coach_Prioritization",
  "SafeRecovery",
] as const;

export type NodeName = (typeof NODE_NAMES)[number];

/**
 * Graph state schema. All nodes read/write these channels.
 * - overwrite: user_profile, discovery_results, active_milestones, last_active_node, financial_profile
 * - append: messages, error_log
 */
export const TuitionLiftState = Annotation.Root({
  user_profile: Annotation<UserProfile | undefined>({ reducer: (_, y) => y }),
  discovery_results: Annotation<DiscoveryResult[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  active_milestones: Annotation<ActiveMilestone[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  last_active_node: Annotation<string | undefined>({ reducer: (_, y) => y }),
  financial_profile: Annotation<FinancialProfile | undefined>({
    reducer: (_, y) => y,
  }),
  error_log: Annotation<ErrorLogEntry[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type TuitionLiftStateType = typeof TuitionLiftState.State;
