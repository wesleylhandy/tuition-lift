/**
 * GET /api/coach/notifications — Dashboard toasts for deadline, Micro-Task.
 * T031: Return dashboard_toast rows from notification_log for polling.
 * Respects 24h limit (data written by deadline-check; this is read-only).
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §6
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

/** Encouraging Coach persona: action-oriented, athletic metaphors (FR-014). */
const NOTIFICATION_TITLES: Record<string, string> = {
  deadline_72h: "72 hours to go",
  deadline_24h: "24 hours left",
  micro_task: "Time for a quick win",
  check_in: "Have you heard back?",
};

/** Encouraging Coach persona: win-focused, momentum language (FR-014). */
const NOTIFICATION_BODIES: Record<string, string> = {
  deadline_72h: "Deadlines approaching — time to lock in and check your game plan.",
  deadline_24h: "Deadlines tomorrow — lock in and submit. You've got this.",
  micro_task: "One small win today — 5 minutes unlocks momentum.",
  check_in: "Any updates? One quick check keeps you in the game.",
};

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  let query = supabase
    .from("notification_log")
    .select("id, notification_type, sent_at, application_ids")
    .eq("user_id", user.id)
    .eq("channel", "dashboard_toast")
    .order("sent_at", { ascending: false });

  if (since) {
    query = query.gte("sent_at", since);
  }

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }

  const notifications = (rows ?? []).map((row) => {
    const type =
      (row.notification_type as string) ?? "deadline_72h";
    return {
      id: row.id,
      type,
      title: NOTIFICATION_TITLES[type] ?? "Notification",
      body: NOTIFICATION_BODIES[type] ?? "Check your game plan.",
      applicationIds: row.application_ids ?? [],
      createdAt: row.sent_at,
    };
  });

  return NextResponse.json({ notifications });
}
