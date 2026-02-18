"use server";

/**
 * Server Action: verifySubmission
 * Marks an application as Submitted after user confirmation (per Coach verification protocol).
 * Per contracts/server-actions.md §3 — authenticate, validate ownership, update status.
 */
import { createServerSupabaseClient } from "../supabase/server";
import { createDbClient } from "@repo/db";
import { z } from "zod";

const verifyInputSchema = z.object({
  application_id: z.string().uuid(),
  confirmed: z.boolean(),
});

export type VerifySubmissionResult = {
  success: boolean;
  error?: string;
};

const VALID_SOURCE_STATUSES = ["draft"] as const;

export async function verifySubmission(
  applicationId: string,
  confirmed: boolean
): Promise<VerifySubmissionResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { success: false, error: "Not authorized" };
  }

  const parsed = verifyInputSchema.safeParse({
    application_id: applicationId,
    confirmed,
  });

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Validation failed";
    return { success: false, error: message };
  }

  const { application_id: id, confirmed: isConfirmed } = parsed.data;

  if (!isConfirmed) {
    return { success: true };
  }

  const db = createDbClient();

  const { data: app, error: fetchError } = await db
    .from("applications")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: "Not authorized" };
  }

  if (!app || app.user_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  if (!VALID_SOURCE_STATUSES.includes(app.status as (typeof VALID_SOURCE_STATUSES)[number])) {
    return { success: false, error: "Invalid status transition" };
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await db
    .from("applications")
    .update({
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return {
      success: false,
      error: "Failed to update application",
    };
  }

  if (!updated) {
    return { success: false, error: "Invalid status transition" };
  }

  return { success: true };
}
