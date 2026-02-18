/**
 * T034: Check-in batch — backfill check_in_tasks for applications submitted 21+ days ago.
 * Catches any missed by the event-driven schedule (e.g. event failure, Inngest outage).
 * Per FR-011, data-model.md §3.
 */
import { createDbClient } from "@repo/db";

export interface RunCheckInBatchResult {
  created: number;
  skipped: number;
}

/**
 * Query applications with submitted_at 21+ days ago that have no check_in_tasks row.
 * Create check_in_tasks for each.
 */
export async function runCheckInBatch(): Promise<RunCheckInBatchResult> {
  const db = createDbClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);
  const cutoffIso = cutoff.toISOString();

  const { data: apps, error: fetchError } = await db
    .from("applications")
    .select("id, user_id, submitted_at")
    .eq("status", "submitted")
    .not("submitted_at", "is", null)
    .lte("submitted_at", cutoffIso);

  if (fetchError) {
    throw new Error(`Check-in batch fetch failed: ${fetchError.message}`);
  }

  const rows = apps ?? [];
  let created = 0;
  let skipped = 0;

  for (const app of rows) {
    const submittedAt = app.submitted_at;
    if (!submittedAt) continue;

    const dueAt = new Date(submittedAt);
    dueAt.setDate(dueAt.getDate() + 21);

    const { data: existing } = await db
      .from("check_in_tasks")
      .select("id")
      .eq("user_id", app.user_id)
      .eq("application_id", app.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error: insertError } = await db.from("check_in_tasks").insert({
      user_id: app.user_id,
      application_id: app.id,
      due_at: dueAt.toISOString(),
      status: "pending",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        skipped++;
        continue;
      }
      throw new Error(
        `Check-in batch insert failed for ${app.id}: ${insertError.message}`
      );
    }
    created++;
  }

  return { created, skipped };
}
