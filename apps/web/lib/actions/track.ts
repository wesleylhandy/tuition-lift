"use server";

/**
 * Server Action: trackScholarship
 * Adds a scholarship to the user's tracked applications.
 * Per contracts/server-actions.md §2: fetches profile, derives academic_year from award_year;
 * blocks when award_year null. need_match_score from DiscoveryResult when tracking from feed.
 */
import { z } from "zod";
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient, awardYearToAcademicYear } from "@repo/db";

const trackInputSchema = z.object({
  scholarship_id: z.string().uuid(),
  need_match_score: z.number().min(0).max(100).nullable().optional(),
});

export type TrackScholarshipResult = {
  success: boolean;
  error?: string;
};

export async function trackScholarship(
  scholarshipId: string,
  needMatchScore?: number | null
): Promise<TrackScholarshipResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = trackInputSchema.safeParse({
    scholarship_id: scholarshipId,
    need_match_score: needMatchScore ?? null,
  });
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Validation failed";
    return { success: false, error: message };
  }

  const { scholarship_id: id } = parsed.data;
  const db = createDbClient();

  // T016: Derive academic_year from profile award_year; block when null
  const { data: profile } = await db
    .from("profiles")
    .select("award_year")
    .eq("id", user.id)
    .single();

  if (!profile?.award_year) {
    return {
      success: false,
      error: "Please select your target award year in onboarding to track scholarships.",
    };
  }

  const academicYear = awardYearToAcademicYear(profile.award_year);

  const { data: scholarship, error: fetchError } = await db
    .from("scholarships")
    .select("id, trust_score, deadline")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: "Scholarship not found or inactive" };
  }

  if (!scholarship) {
    return { success: false, error: "Scholarship not found or inactive" };
  }

  if (scholarship.trust_score <= 0) {
    return { success: false, error: "Scholarship not found or inactive" };
  }

  if (scholarship.deadline) {
    const today = new Date().toISOString().slice(0, 10);
    if (scholarship.deadline < today) {
      return { success: false, error: "Scholarship not found or inactive" };
    }
  }

  const upsertPayload = {
    user_id: user.id,
    scholarship_id: id,
    academic_year: academicYear,
    status: "draft" as const,
    ...(parsed.data.need_match_score != null && {
      need_match_score: parsed.data.need_match_score,
    }),
  };

  const { error: insertError } = await db.from("applications").upsert(
    upsertPayload,
    {
      onConflict: "user_id,scholarship_id,academic_year",
      ignoreDuplicates: true,
    }
  );

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: true };
    }
    return {
      success: false,
      error: "Failed to track scholarship",
    };
  }

  return { success: true };
}
