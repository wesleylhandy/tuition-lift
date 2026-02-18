/**
 * Coach Execution Engine: state mapper, Momentum Score, game plan.
 * Per plan.md: Coach logic in apps/agent; APIs in apps/web.
 *
 * Modules (implemented in Phase 2):
 * - state-mapper.ts: coachStateToDb, dbToCoachState (T009)
 * - momentum-score.ts: Deadline Proximity × 0.6 + Trust Score × 0.4 (T010)
 * - game-plan.ts: Top 3 batch logic (T014)
 */

export { coachStateToDb, dbToCoachState } from "./state-mapper";
export {
  coachStateMappingSchema,
} from "./schemas";
export type { CoachStateMapping } from "./schemas";
export {
  computeMomentumScore,
  computeMomentumScoreForApplication,
  computeDeadlineProximity,
  normalizeTrustScore,
} from "./momentum-score";
export type { DeadlineProximityInput, MomentumScoreInput } from "./momentum-score";
