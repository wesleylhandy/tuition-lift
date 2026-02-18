/**
 * Coach application lifecycle transition validation (T018).
 * Per data-model.md §1: Tracked → Drafting → Review → Submitted → Outcome Pending → Won/Lost.
 * Submitted and Won require HITL confirmation (FR-006).
 */

import type { CoachState } from "./state-mapper";

/** Valid transitions: from current state → allowed target states. */
const VALID_TRANSITIONS: Record<CoachState, readonly CoachState[]> = {
  Tracked: ["Drafting"],
  Drafting: ["Tracked", "Review", "Submitted"],
  Review: ["Drafting", "Submitted"],
  Submitted: ["Outcome Pending"],
  "Outcome Pending": ["Won", "Lost"],
  Won: [],
  Lost: [],
};

/** Coach states that require HITL confirmation before persisting. */
const HITL_STATES: CoachState[] = ["Submitted", "Won"];

/**
 * Validates whether a transition from current to target is allowed.
 * Returns true if valid, false otherwise.
 */
export function isTransitionValid(
  currentState: CoachState,
  targetState: CoachState
): boolean {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed) return false;
  return allowed.includes(targetState);
}

/**
 * Returns true if the target state requires HITL confirmation.
 * For Submitted and Won, API must return requiresConfirmation and not persist until confirmed.
 */
export function requiresHitlConfirmation(targetState: CoachState): boolean {
  return HITL_STATES.includes(targetState);
}
