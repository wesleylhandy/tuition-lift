/**
 * Check-in complete logic (US5).
 * Per contracts/coach-api.md §4 — FR-011, FR-012.
 * T035: Update check_in_tasks; if outcome=Won trigger HITL (return requiresConfirmation).
 */
import { createDbClient } from "@repo/db";
import { coachStateToDb } from "./state-mapper";

export type CheckInAction = "completed" | "dismissed";
export type CheckInOutcome = "Won" | "Lost" | null;

export interface CheckInCompleteInput {
  userId: string;
  checkInTaskId: string;
  action: CheckInAction;
  outcome: CheckInOutcome;
}

export interface CheckInCompleteResult {
  success: boolean;
  checkInTaskId: string;
  status: "completed" | "dismissed";
  requiresConfirmation?: boolean;
  applicationId?: string;
}

export interface CheckInCompleteError {
  code: "not_found" | "invalid_input" | "db_error";
  message: string;
}

/**
 * Mark check-in task as completed or dismissed.
 * - completed + Won: update task, return requiresConfirmation (HITL flow)
 * - completed + Lost: update task and application status to rejected
 * - dismissed: update task only
 */
export async function completeCheckIn(
  input: CheckInCompleteInput
): Promise<CheckInCompleteResult | CheckInCompleteError> {
  const { userId, checkInTaskId, action, outcome } = input;

  if (action === "completed" && (outcome !== "Won" && outcome !== "Lost")) {
    return {
      code: "invalid_input",
      message: "outcome is required when action=completed; must be Won or Lost",
    };
  }

  const db = createDbClient();
  const { data: task, error: fetchError } = await db
    .from("check_in_tasks")
    .select("id, user_id, application_id, status")
    .eq("id", checkInTaskId)
    .maybeSingle();

  if (fetchError) {
    return { code: "db_error", message: "Failed to load check-in task" };
  }

  if (!task || task.user_id !== userId) {
    return {
      code: "not_found",
      message: "Check-in task not found or access denied",
    };
  }

  if (task.status !== "pending") {
    return {
      code: "invalid_input",
      message: "Check-in task already completed or dismissed",
    };
  }

  const now = new Date().toISOString();

  if (action === "dismissed") {
    const { error: updateError } = await db
      .from("check_in_tasks")
      .update({ status: "dismissed" })
      .eq("id", checkInTaskId)
      .eq("user_id", userId);

    if (updateError) {
      return { code: "db_error", message: "Failed to update check-in task" };
    }

    return {
      success: true,
      checkInTaskId,
      status: "dismissed",
    };
  }

  // action === "completed"
  const { error: taskUpdateError } = await db
    .from("check_in_tasks")
    .update({ status: "completed", completed_at: now })
    .eq("id", checkInTaskId)
    .eq("user_id", userId);

  if (taskUpdateError) {
    return { code: "db_error", message: "Failed to update check-in task" };
  }

  if (outcome === "Lost") {
    const { error: appError } = await db
      .from("applications")
      .update({
        status: coachStateToDb("Lost"),
        last_progress_at: now,
        updated_at: now,
      })
      .eq("id", task.application_id)
      .eq("user_id", userId);

    if (appError) {
      return { code: "db_error", message: "Failed to update application" };
    }
  }

  return {
    success: true,
    checkInTaskId,
    status: "completed",
    ...(outcome === "Won" && {
      requiresConfirmation: true,
      applicationId: task.application_id,
    }),
  };
}
