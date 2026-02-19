/**
 * GET /api/coach/applications — Application Tracker data.
 *
 * Returns all applications for the user, mapped to display buckets per data-model.md:
 * Tracked, Drafting, Review (draft); Submitted (submitted); Won (awarded); Lost (rejected, withdrawn).
 *
 * Per T028 [US3]: Application Tracker Lifecycle View.
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createDbClient } from "@repo/db";
import { dbToCoachState } from "agent/lib/coach/state-mapper";
import type { DbApplicationStatus } from "agent/lib/coach/state-mapper";

type DisplayBucket =
  | "Tracked"
  | "Drafting"
  | "Review"
  | "Submitted"
  | "Outcome Pending"
  | "Won"
  | "Lost";

interface AppWithScholarship {
  id: string;
  status: DbApplicationStatus;
  last_progress_at: string | null;
  scholarships: {
    title: string;
    url: string | null;
    deadline: string | null;
    amount: number | null;
  } | null;
}

interface TrackerApplication {
  applicationId: string;
  scholarshipTitle: string;
  scholarshipUrl: string | null;
  status: DbApplicationStatus;
  coachState: string;
  deadline: string | null;
  amount: number | null;
}

function toDisplayBucket(
  status: DbApplicationStatus,
  lastProgressAt: string | null
): DisplayBucket {
  if (status === "draft") {
    if (!lastProgressAt) return "Tracked";
    return "Drafting";
  }
  if (status === "submitted") return "Submitted";
  if (status === "awarded") return "Won";
  if (status === "rejected" || status === "withdrawn") return "Lost";
  return "Tracked";
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createDbClient();
    const { data: apps, error: appsError } = await db
      .from("applications")
      .select(
        `
        id,
        status,
        last_progress_at,
        scholarships (
          title,
          url,
          deadline,
          amount
        )
      `
      )
      .eq("user_id", user.id);

    if (appsError) {
      throw new Error(`Applications fetch failed: ${appsError.message}`);
    }

    const rows = (apps ?? []) as unknown as AppWithScholarship[];
    const buckets: Record<DisplayBucket, TrackerApplication[]> = {
      Tracked: [],
      Drafting: [],
      Review: [],
      Submitted: [],
      "Outcome Pending": [],
      Won: [],
      Lost: [],
    };

    for (const row of rows) {
      const bucket = toDisplayBucket(
        row.status as DbApplicationStatus,
        row.last_progress_at
      );
      const coachState = dbToCoachState(row.status as DbApplicationStatus);
      const item: TrackerApplication = {
        applicationId: row.id,
        scholarshipTitle: row.scholarships?.title ?? "Scholarship",
        scholarshipUrl: row.scholarships?.url ?? null,
        status: row.status as DbApplicationStatus,
        coachState,
        deadline: row.scholarships?.deadline ?? null,
        amount: row.scholarships?.amount ?? null,
      };
      buckets[bucket].push(item);
    }

    return NextResponse.json({ buckets });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load applications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
