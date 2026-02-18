"use server";

/**
 * Server Action: getDismissedScholarshipIds
 * Returns scholarship IDs dismissed by the user for the given run (or null for run-agnostic).
 * Used by Match Inbox to filter out dismissed scholarships per T019.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient } from "@repo/db";

export async function getDismissedScholarshipIds(
  discoveryRunId: string | null
): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return [];
  }

  const db = createDbClient();
  let query = db
    .from("dismissals")
    .select("scholarship_id")
    .eq("user_id", user.id);

  if (discoveryRunId) {
    query = query.or(
      `discovery_run_id.eq.${discoveryRunId},discovery_run_id.is.null`
    );
  } else {
    query = query.is("discovery_run_id", null);
  }

  const { data: rows, error } = await query.limit(10_000);

  if (error) return [];
  return (rows ?? []).map((r) => r.scholarship_id);
}
