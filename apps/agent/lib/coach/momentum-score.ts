/**
 * Momentum Score: (Deadline Proximity × 0.6) + (Trust Score × 0.4).
 * Per data-model.md, research.md §6, tasks T010. Used for Top 3 prioritization.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §1 — momentumScore in response
 * @see specs/005-coach-execution-engine/data-model.md — momentum_score column
 *
 * Trust Score: scholarship.trust_score (0–100), normalized to 0–1.
 * Deadline Proximity: composite of (a) time-to-deadline and (b) application stage.
 * Quadrant logic: high trust + high urgency = best; low trust deprioritizes even when urgent.
 */

import type { CoachState } from "./state-mapper";
import { dbToCoachState } from "./state-mapper";
import type { DbApplicationStatus } from "./state-mapper";

/** Max hours for deadline proximity (90 days). Past this, time component = 0. */
const MAX_HOURS_TO_DEADLINE = 90 * 24;

/** Application stage urgency (research.md §6): Review > Drafting > Tracked. */
const STAGE_URGENCY: Record<CoachState, number> = {
  Tracked: 0.3,
  Drafting: 0.6,
  Review: 1.0,
  Submitted: 0,
  "Outcome Pending": 0,
  Won: 0,
  Lost: 0,
};

/** Normalize Trust Score from 0–100 (Reputation Engine) to 0–1. */
export function normalizeTrustScore(trustScore: number): number {
  return Math.max(0, Math.min(1, trustScore / 100));
}

export interface DeadlineProximityInput {
  /** Scholarship deadline (Date, ISO string, or YYYY-MM-DD). Null when no deadline. */
  deadline: Date | string | null;
  /** Reference time for "now". Defaults to new Date(). */
  now?: Date;
  /** Coach lifecycle stage. If omitted and status provided, derived from dbToCoachState. */
  coachStage?: CoachState;
  /** DB application_status. Used when coachStage not provided. */
  applicationStatus?: DbApplicationStatus;
}

/**
 * Compute Deadline Proximity (0–1): composite of time-to-deadline and application stage.
 * Time: 1 - (hours_until_deadline / max_hours); past deadline = max urgency.
 * Stage: Review=1.0, Drafting=0.6, Tracked=0.3. Weights: 70% time, 30% stage.
 */
export function computeDeadlineProximity(input: DeadlineProximityInput): number {
  const now = input.now ?? new Date();
  const stage =
    input.coachStage ??
    (input.applicationStatus ? dbToCoachState(input.applicationStatus) : "Drafting");
  const stageComponent = STAGE_URGENCY[stage] ?? 0.5;

  if (!input.deadline) {
    return stageComponent;
  }

  const deadline =
    typeof input.deadline === "string"
      ? new Date(input.deadline.includes("T") ? input.deadline : `${input.deadline}T23:59:59Z`)
      : input.deadline;
  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  let timeComponent: number;
  if (hoursUntil <= 0) {
    timeComponent = 1;
  } else {
    const ratio = Math.min(1, hoursUntil / MAX_HOURS_TO_DEADLINE);
    timeComponent = 1 - ratio;
  }

  return timeComponent * 0.7 + stageComponent * 0.3;
}

/**
 * Compute momentum score from normalized inputs (0–1 each).
 * Formula: (Deadline Proximity × 0.6) + (Trust Score × 0.4).
 */
export function computeMomentumScore(
  deadlineProximity: number,
  trustScore: number
): number {
  const dp = Math.max(0, Math.min(1, deadlineProximity));
  const ts = Math.max(0, Math.min(1, trustScore));
  return Math.round((dp * 0.6 + ts * 0.4) * 100) / 100;
}

export interface MomentumScoreInput {
  deadline: Date | string | null;
  trustScore: number;
  applicationStatus?: DbApplicationStatus;
  coachStage?: CoachState;
  now?: Date;
}

/**
 * Compute full Momentum Score for an application from raw inputs.
 * Normalizes trust score, computes deadline proximity, applies formula.
 */
export function computeMomentumScoreForApplication(input: MomentumScoreInput): number {
  const deadlineProximity = computeDeadlineProximity({
    deadline: input.deadline,
    now: input.now,
    coachStage: input.coachStage,
    applicationStatus: input.applicationStatus,
  });
  const normalizedTrust = normalizeTrustScore(input.trustScore);
  return computeMomentumScore(deadlineProximity, normalizedTrust);
}
