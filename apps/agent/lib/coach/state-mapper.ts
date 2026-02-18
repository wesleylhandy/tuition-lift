/**
 * Coach state ↔ DB application_status mapping.
 * Per data-model.md §1. Implemented in T009.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §2 — targetState values
 * @see specs/005-coach-execution-engine/data-model.md — application_status enum
 */

export type CoachState =
  | "Tracked"
  | "Drafting"
  | "Review"
  | "Submitted"
  | "Outcome Pending"
  | "Won"
  | "Lost";

export type DbApplicationStatus = "draft" | "submitted" | "awarded" | "rejected" | "withdrawn";

/** Coach state → DB application_status. T009 implements. */
export function coachStateToDb(state: CoachState): DbApplicationStatus {
  const map: Record<CoachState, DbApplicationStatus> = {
    Tracked: "draft",
    Drafting: "draft",
    Review: "draft",
    Submitted: "submitted",
    "Outcome Pending": "submitted",
    Won: "awarded",
    Lost: "rejected",
  };
  return map[state];
}

/** DB application_status → Coach state. T009 implements. */
export function dbToCoachState(status: DbApplicationStatus): CoachState {
  const map: Record<DbApplicationStatus, CoachState> = {
    draft: "Drafting",
    submitted: "Outcome Pending",
    awarded: "Won",
    rejected: "Lost",
    withdrawn: "Lost",
  };
  return map[status];
}
