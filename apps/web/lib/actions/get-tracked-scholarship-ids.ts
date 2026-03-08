"use server";

/**
 * Server Action: getTrackedScholarshipIds
 * Returns scholarship IDs the user has in applications for their profile award year.
 * US1 T020: Derives academic_year from profile.award_year; returns [] when award_year null.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient, awardYearToAcademicYear } from "@repo/db";

export async function getTrackedScholarshipIds(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return [];
  }

  const db = createDbClient();
  const { data: profile } = await db
    .from("profiles")
    .select("award_year")
    .eq("id", user.id)
    .single();

  if (!profile?.award_year) {
    return [];
  }

  const academicYear = awardYearToAcademicYear(profile.award_year);

  const { data: rows, error } = await db
    .from("applications")
    .select("scholarship_id")
    .eq("user_id", user.id)
    .eq("academic_year", academicYear);

  if (error) return [];
  return (rows ?? []).map((r) => r.scholarship_id);
}
