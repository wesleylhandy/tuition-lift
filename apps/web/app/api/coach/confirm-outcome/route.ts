/**
 * POST /api/coach/confirm-outcome — HITL confirmation for Submitted or Won (FR-006, FR-006a, FR-007).
 *
 * T022–T025: Auth, validate applicationId and outcomeType; on confirmed:
 * - Submitted: transition to submitted, set submitted_at (T023)
 * - Won: transition to awarded, set confirmed_at (T024); Total Debt Lifted computed on read from awarded + confirmed_at.
 * On declined: return success false, no DB changes (T025).
 *
 * Per contracts/coach-api.md §3.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { inngest } from "../../../../lib/inngest/client";
import {
  confirmOutcome,
  type ConfirmOutcomeType,
} from "agent/lib/coach/confirm-outcome";

const OUTCOME_TYPES = ["Submitted", "Won"] as const;
type OutcomeType = (typeof OUTCOME_TYPES)[number];

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
    applicationId?: unknown;
    confirmed?: unknown;
    outcomeType?: unknown;
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
    !isValidUuid(body.applicationId) ||
    typeof body.confirmed !== "boolean" ||
    !(typeof body.outcomeType === "string" && OUTCOME_TYPES.includes(body.outcomeType as OutcomeType))
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields. Required: applicationId (uuid), confirmed (boolean), outcomeType (Submitted|Won).",
      },
      { status: 400 }
    );
  }

  const result = await confirmOutcome({
    userId: user.id,
    applicationId: body.applicationId,
    confirmed: body.confirmed,
    outcomeType: body.outcomeType as ConfirmOutcomeType,
  });

  if ("code" in result) {
    if (result.code === "not_found") {
      return NextResponse.json(
        { error: result.message },
        { status: 403 }
      );
    }
    if (result.code === "invalid_precondition") {
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

  if (result.success) {
    // Inngest: contract §7 — tuition-lift/coach.progress.recorded on status change
    await inngest.send({
      name: "tuition-lift/coach.progress.recorded",
      data: { userId: user.id, applicationId: result.applicationId },
    });
    // Inngest: contract §7 — tuition-lift/coach.check-in.schedule (FR-011, 21 days)
    if (body.outcomeType === "Submitted") {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 21);
      await inngest.send({
        name: "tuition-lift/coach.check-in.schedule",
        data: {
          userId: user.id,
          applicationId: result.applicationId,
          dueAt: dueAt.toISOString(),
        },
      });
    }
  }

  return NextResponse.json({
    success: result.success,
    applicationId: result.applicationId,
    ...(result.status != null && { status: result.status }),
    ...(result.totalDebtLiftedUpdated != null && {
      totalDebtLiftedUpdated: result.totalDebtLiftedUpdated,
    }),
    ...(result.message != null && { message: result.message }),
  });
}
