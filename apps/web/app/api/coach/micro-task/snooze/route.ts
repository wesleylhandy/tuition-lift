/**
 * POST /api/coach/micro-task/snooze — Snooze Micro-Task suggestion (FR-013b).
 *
 * T041: Auth, validate snoozedUntil < nearest app deadline, store in profiles.preferences.
 *
 * Per contracts/coach-api.md §5.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { getNearestDeadlineForUser } from "agent/lib/coach/micro-task";

/** RFC 3339 / ISO 8601 date-time regex (simplified). */
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { snoozedUntil?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const raw = body.snoozedUntil;
  if (typeof raw !== "string" || !ISO_DATETIME.test(raw)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid snoozedUntil. Required: ISO 8601 datetime (e.g. 2025-02-14T12:00:00Z).",
      },
      { status: 400 }
    );
  }

  const snoozedUntil = new Date(raw);
  if (isNaN(snoozedUntil.getTime()) || snoozedUntil <= new Date()) {
    return NextResponse.json(
      { error: "snoozedUntil must be a valid future datetime." },
      { status: 400 }
    );
  }

  const nearestDeadline = await getNearestDeadlineForUser(user.id);
  if (nearestDeadline && snoozedUntil >= nearestDeadline) {
    return NextResponse.json(
      {
        error:
          "snoozedUntil cannot extend beyond the nearest application deadline. Snooze must end before your soonest due date.",
      },
      { status: 400 }
    );
  }

  const db = supabase;
  const { data: profile } = await db
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();

  const existing = (profile as { preferences?: Record<string, unknown> })
    ?.preferences ?? {};
  const nextPreferences = {
    ...existing,
    micro_task_snoozed_until: raw,
  };

  const { error: updateError } = await db
    .from("profiles")
    .update({
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save snooze preference." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    snoozedUntil: raw,
  });
}
