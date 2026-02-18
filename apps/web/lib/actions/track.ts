"use server";

/**
 * Server Action: trackScholarship
 * Adds a scholarship to the user's tracked applications.
 * Per contracts/server-actions.md §1 — authenticate, validate scholarship, insert applications.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient, applicationSchema } from "@repo/db";

const trackInputSchema = applicationSchema.pick({
  scholarship_id: true,
  academic_year: true,
});

export type TrackScholarshipResult = {
  success: boolean;
  error?: string;
};

export async function trackScholarship(
  scholarshipId: string,
  academicYear: string
): Promise<TrackScholarshipResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = trackInputSchema.safeParse({
    scholarship_id: scholarshipId,
    academic_year: academicYear,
  });
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Validation failed";
    return { success: false, error: message };
  }

  const { scholarship_id: id, academic_year: year } = parsed.data;

  const db = createDbClient();

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

  const { error: insertError } = await db.from("applications").upsert(
    {
      user_id: user.id,
      scholarship_id: id,
      academic_year: year,
      status: "draft",
    },
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
