/**
 * POST /api/coach/application/status — Application lifecycle status transition.
 *
 * T019–T021: Auth, ownership check, validate transition, HITL for Submitted/Won,
 * persist non-HITL transitions, emit tuition-lift/coach.progress.recorded on status change.
 *
 * Per contracts/coach-api.md §2.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { inngest } from "../../../../../lib/inngest/client";
import {
  coachStateToDb,
  dbToCoachState,
  type CoachState,
} from "agent/lib/coach/state-mapper";
import {
  isTransitionValid,
  requiresHitlConfirmation,
} from "agent/lib/coach/lifecycle";

const TARGET_STATES: CoachState[] = [
  "Tracked",
  "Drafting",
  "Review",
  "Submitted",
  "Outcome Pending",
  "Won",
  "Lost",
];

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { applicationId?: string; targetState?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const applicationId = body?.applicationId;
  const targetStateRaw = body?.targetState;

  if (
    !applicationId ||
    typeof applicationId !== "string" ||
    !targetStateRaw ||
    typeof targetStateRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid applicationId or targetState" },
      { status: 400 }
    );
  }

  const targetState = targetStateRaw as CoachState;
  if (!TARGET_STATES.includes(targetState)) {
    return NextResponse.json(
      { error: `Invalid targetState. Must be one of: ${TARGET_STATES.join(", ")}` },
      { status: 400 }
    );
  }

  const db = createDbClient();
  const { data: app, error: fetchError } = await db
    .from("applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to load application" },
      { status: 500 }
    );
  }

  if (!app || app.user_id !== user.id) {
    return NextResponse.json(
      { error: "Application not found or access denied" },
      { status: 403 }
    );
  }

  const currentState = dbToCoachState(
    app.status as "draft" | "submitted" | "awarded" | "rejected" | "withdrawn"
  );

  if (!isTransitionValid(currentState, targetState)) {
    return NextResponse.json(
      { error: `Invalid transition from ${currentState} to ${targetState}` },
      { status: 400 }
    );
  }

  if (requiresHitlConfirmation(targetState)) {
    const message =
      targetState === "Submitted"
        ? "Please confirm you've submitted this application."
        : targetState === "Won"
          ? "Please confirm you've won this scholarship."
          : "";
    return NextResponse.json({
      success: true,
      requiresConfirmation: true,
      applicationId,
      targetState,
      message,
    });
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
    return NextResponse.json(
      { error: "Failed to update application status" },
      { status: 500 }
    );
  }

  // Inngest: contract §7 — tuition-lift/coach.progress.recorded on status change
  await inngest.send({
    name: "tuition-lift/coach.progress.recorded",
    data: { userId: user.id, applicationId },
  });

  return NextResponse.json({
    success: true,
    applicationId,
    currentState: targetState,
  });
}
