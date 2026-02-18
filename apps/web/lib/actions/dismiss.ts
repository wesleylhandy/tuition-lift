"use server";

/**
 * Server Action: dismissScholarship
 * Soft-dismisses a scholarship from the Match Inbox for the current discovery run.
 * Per contracts/server-actions.md §2 — authenticate, insert dismissals.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient, dismissalInputSchema } from "@repo/db";

export type DismissScholarshipResult = {
  success: boolean;
  error?: string;
};

export async function dismissScholarship(
  scholarshipId: string,
  discoveryRunId?: string | null
): Promise<DismissScholarshipResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = dismissalInputSchema.safeParse({
    scholarship_id: scholarshipId,
    discovery_run_id: discoveryRunId ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Validation failed";
    return { success: false, error: message };
  }

  const { scholarship_id, discovery_run_id } = parsed.data;
  const db = createDbClient();

  const insertPayload =
    typeof discovery_run_id === "string"
      ? { user_id: user.id, scholarship_id, discovery_run_id }
      : { user_id: user.id, scholarship_id };

  const { error: insertError } = await db.from("dismissals").insert(insertPayload);

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: true };
    }
    return {
      success: false,
      error: "Failed to dismiss scholarship",
    };
  }

  return { success: true };
}
