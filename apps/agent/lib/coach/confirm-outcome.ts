/**
 * HITL confirm-outcome logic (US3).
 * Per data-model.md, contracts/coach-api.md §3.
 * T022–T025: Validate and persist Submitted or Won confirmation.
 *
 * Total Debt Lifted computed on read from applications where status='awarded' AND confirmed_at IS NOT NULL.
 */
import { createDbClient } from "@repo/db";
import { coachStateToDb } from "./state-mapper";
import type { CoachState } from "./state-mapper";

export type ConfirmOutcomeType = "Submitted" | "Won";

export interface ConfirmOutcomeInput {
  userId: string;
  applicationId: string;
  confirmed: boolean;
  outcomeType: ConfirmOutcomeType;
}

export interface ConfirmOutcomeResult {
  success: boolean;
  applicationId: string;
  status?: CoachState;
  totalDebtLiftedUpdated?: boolean;
  message?: string;
}

export interface ConfirmOutcomeError {
  code: "invalid_precondition" | "not_found" | "db_error";
  message: string;
}

/**
 * Process HITL confirmation for Submitted or Won.
 * On declined (confirmed=false): returns success false, no DB changes.
 * On confirmed: validates preconditions, persists status + submitted_at or confirmed_at.
 */
export async function confirmOutcome(
  input: ConfirmOutcomeInput
): Promise<ConfirmOutcomeResult | ConfirmOutcomeError> {
  const { userId, applicationId, confirmed, outcomeType } = input;

  if (!confirmed) {
    return {
      success: false,
      applicationId,
      message: "Confirmation declined. No changes made.",
    };
  }

  const db = createDbClient();
  const { data: app, error: fetchError } = await db
    .from("applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return {
      code: "db_error",
      message: "Failed to load application",
    };
  }

  if (!app || app.user_id !== userId) {
    return {
      code: "not_found",
      message: "Application not found or access denied",
    };
  }

  const currentStatus = app.status as string;

  if (outcomeType === "Submitted") {
    if (currentStatus !== "draft") {
      return {
        code: "invalid_precondition",
        message:
          "Application is not in Draft/Review. Submitted confirmation only valid when transitioning from Draft.",
      };
    }
  } else {
    if (currentStatus !== "submitted") {
      return {
        code: "invalid_precondition",
        message:
          "Application is not submitted. Won confirmation only valid when transitioning from Outcome Pending.",
      };
    }
  }

  const now = new Date().toISOString();
  const newDbStatus = coachStateToDb(outcomeType);

  const updates: Record<string, unknown> = {
    status: newDbStatus,
    last_progress_at: now,
    updated_at: now,
  };

  if (outcomeType === "Submitted") {
    updates.submitted_at = now;
  } else {
    updates.confirmed_at = now;
  }

  const { error: updateError } = await db
    .from("applications")
    .update(updates)
    .eq("id", applicationId)
    .eq("user_id", userId);

  if (updateError) {
    return {
      code: "db_error",
      message: "Failed to update application",
    };
  }

  return {
    success: true,
    applicationId,
    status: outcomeType,
    totalDebtLiftedUpdated: outcomeType === "Won",
  };
}
