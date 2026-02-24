/**
 * TuitionLiftState — LangGraph state schema.
 * Per data-model.md §1; persisted via checkpoints.
 * Reducers: overwrite for scalar/object fields; append for messages and error_log.
 *
 * @see LangGraph JS: https://langchain-ai.github.io/langgraphjs/ — Annotation.Root, reducers
 */
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import type {
  ActiveMilestone,
  DiscoveryResult,
  ErrorLogEntry,
  FinancialProfile,
  UserProfile,
} from "./schemas";

/**
 * Canonical node names — last_active_node value set by each node on transition.
 * @see data-model.md §7
 */
export const NODE_NAMES = [
  "Advisor_Search",
  "Advisor_Verify",
  "Coach_Prioritization",
  "Coach_SAIConfirm",
  "Coach_Major_Pivot",
  "SafeRecovery",
] as const;

export type NodeName = (typeof NODE_NAMES)[number];

/**
 * Graph state schema. All nodes read/write these channels.
 * - overwrite: user_profile, discovery_results, active_milestones, last_active_node, financial_profile
 * - append: messages, error_log
 */
/** US2: Pending SAI range confirmation; Coach prompts before Advisor uses SAI bands. */
export type PendingSaiConfirmation = boolean;

/** US2: User-approved flag for SAI range in search; undefined until confirmed. */
export type SaiRangeApproved = boolean | undefined;

export const TuitionLiftState = Annotation.Root({
  user_profile: Annotation<UserProfile | undefined>({ reducer: (_, y) => y }),
  /** Per data-model §1: DiscoveryResult includes trust_report, verification_status, categories, deadline, amount. */
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
  /** US2: Set when Advisor determines SAI range would help; Coach asks confirmation. */
  pending_sai_confirmation: Annotation<PendingSaiConfirmation>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  /** US2: true = include SAI band in search; false = income tiers only; undefined = not yet confirmed. */
  sai_range_approved: Annotation<SaiRangeApproved>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  /** US1 (009): Merit-first logic. From load-profile merit_config. */
  merit_filter_preference: Annotation<"merit_only" | "show_all">({
    reducer: (_, y) => y,
    default: () => "show_all",
  }),
  /** US1: true when SAI >= merit_lean_threshold (sai_zone_config). */
  sai_above_merit_threshold: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  /** US1: tier_name from merit_tier_config (e.g. presidential, deans, merit, incentive). */
  merit_tier: Annotation<string | undefined>({
    reducer: (_, y) => y,
  }),
  /** US1: Resolved award year for config lookup. */
  award_year: Annotation<number | undefined>({
    reducer: (_, y) => y,
  }),
  /** US3: True when intended_major empty/undecided; routes to Coach_Major_Pivot. */
  is_undecided_major: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
});

export type TuitionLiftStateType = typeof TuitionLiftState.State;
