"use server";

/**
 * Server Action: getTrackedScholarshipIds
 * Returns scholarship IDs the user has in applications for the current academic year.
 * Used by Match Inbox to pass isTracked to MatchCard per T031.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient } from "@repo/db";
import { getCurrentAcademicYear } from "../utils/academic-year";

export async function getTrackedScholarshipIds(): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return [];
  }

  const academicYear = getCurrentAcademicYear();
  const db = createDbClient();

  const { data: rows, error } = await db
    .from("applications")
    .select("scholarship_id")
    .eq("user_id", user.id)
    .eq("academic_year", academicYear);

  if (error) return [];
  return (rows ?? []).map((r) => r.scholarship_id);
}
