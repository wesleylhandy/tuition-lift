"use server";

/**
 * Server Action: updateTaskStatus — Kanban column change for Coach Game Plan.
 * Maps Kanban status (todo | in_progress | done) to CoachState; persists via applications table.
 * Per T027 [US4]; contracts/kanban-repository-heatmap.md.
 *
 * Returns requiresConfirmation when HITL needed (Submitted, Won); caller shows dialog.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient } from "@repo/db";
import { inngest } from "../inngest/client";
import {
  coachStateToDb,
  dbToCoachState,
  type CoachState,
} from "agent/lib/coach/state-mapper";
import {
  isTransitionValid,
  requiresHitlConfirmation,
} from "agent/lib/coach/lifecycle";

export type KanbanStatus = "todo" | "in_progress" | "done";

const KANBAN_TO_COACH: Record<KanbanStatus, CoachState> = {
  todo: "Drafting",
  in_progress: "Submitted",
  done: "Lost",
};

export type UpdateTaskStatusResult =
  | { success: true; applicationId: string; currentState: CoachState }
  | {
      success: true;
      requiresConfirmation: true;
      applicationId: string;
      targetState: CoachState;
      message: string;
    }
  | { success: false; error: string };

export async function updateTaskStatus(
  applicationId: string,
  newStatus: KanbanStatus
): Promise<UpdateTaskStatusResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (
    !applicationId ||
    typeof applicationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(applicationId)
  ) {
    return { success: false, error: "Invalid application ID" };
  }

  const targetState = KANBAN_TO_COACH[newStatus];
  const db = createDbClient();

  const { data: app, error: fetchError } = await db
    .from("applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: "Failed to load application" };
  }

  if (!app || app.user_id !== user.id) {
    return { success: false, error: "Application not found or access denied" };
  }

  const currentState = dbToCoachState(
    app.status as "draft" | "submitted" | "awarded" | "rejected" | "withdrawn"
  );

  if (!isTransitionValid(currentState, targetState)) {
    return {
      success: false,
      error: `Cannot move from ${currentState} to ${targetState}`,
    };
  }

  if (requiresHitlConfirmation(targetState)) {
    const message =
      targetState === "Submitted"
        ? "Please confirm you've submitted this application."
        : targetState === "Won"
          ? "Please confirm you've won this scholarship."
          : "";
    return {
      success: true,
      requiresConfirmation: true,
      applicationId,
      targetState,
      message,
    };
  }

  const newDbStatus = coachStateToDb(targetState);
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: newDbStatus,
    last_progress_at: now,
    updated_at: now,
  };
  if (newDbStatus === "rejected") {
    updates.confirmed_at = null;
  }

  const { error: updateError } = await db
    .from("applications")
    .update(updates)
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: "Failed to update status" };
  }

  await inngest.send({
    name: "tuition-lift/coach.progress.recorded",
    data: { userId: user.id, applicationId },
  });

  return {
    success: true,
    applicationId,
    currentState: targetState,
  };
}
