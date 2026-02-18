/**
 * POST /api/coach/check-in/complete — Mark Check-in task completed or dismissed (FR-011, FR-012).
 *
 * T035: Auth, update check_in_tasks status. If outcome=Won, return requiresConfirmation
 * to trigger frontend HITL prompt (confirm-outcome flow).
 *
 * Per contracts/coach-api.md §4.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import {
  completeCheckIn,
  type CheckInAction,
  type CheckInOutcome,
} from "agent/lib/coach/check-in-complete";

const ACTIONS = ["completed", "dismissed"] as const;
const OUTCOMES = ["Won", "Lost"] as const;

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    checkInTaskId?: unknown;
    action?: unknown;
    outcome?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    !isValidUuid(body.checkInTaskId) ||
    !(typeof body.action === "string" && ACTIONS.includes(body.action as CheckInAction))
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields. Required: checkInTaskId (uuid), action (completed|dismissed).",
      },
      { status: 400 }
    );
  }

  const action = body.action as CheckInAction;
  let outcome: CheckInOutcome = null;
  if (action === "completed") {
    if (
      typeof body.outcome === "string" &&
      OUTCOMES.includes(body.outcome as "Won" | "Lost")
    ) {
      outcome = body.outcome as CheckInOutcome;
    } else {
      return NextResponse.json(
        { error: "outcome (Won|Lost) is required when action=completed" },
        { status: 400 }
      );
    }
  }

  const result = await completeCheckIn({
    userId: user.id,
    checkInTaskId: body.checkInTaskId,
    action,
    outcome,
  });

  if ("code" in result) {
    if (result.code === "not_found") {
      return NextResponse.json(
        { error: result.message },
        { status: 403 }
      );
    }
    if (result.code === "invalid_input") {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: result.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: result.success,
    checkInTaskId: result.checkInTaskId,
    status: result.status,
    ...(result.requiresConfirmation != null && {
      requiresConfirmation: result.requiresConfirmation,
    }),
    ...(result.applicationId != null && {
      applicationId: result.applicationId,
    }),
  });
}
