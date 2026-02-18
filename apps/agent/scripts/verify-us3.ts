#!/usr/bin/env node
/**
 * Verify US3: Human-in-the-Loop Verification for Outcomes (005 Coach Execution Engine).
 * Independent Test (tasks.md Phase 5): Request Submitted or Won; verify confirmation prompt;
 * confirm → status/total updated; decline → no changes.
 *
 * Prerequisites: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon),
 * test profile with application in draft.
 *
 * Run: pnpm verify-us3
 */
import "./load-env";
import { createDbClient } from "@repo/db";
import { confirmOutcome } from "../lib/coach/confirm-outcome";
import { randomUUID } from "node:crypto";

const ACADEMIC_YEAR = "2025-2026";

async function findTestUserId(): Promise<string | null> {
  const db = createDbClient();
  const testUserId =
    process.env.US3_TEST_USER_ID ??
    process.env.US1_TEST_USER_ID ??
    process.env.SC001_TEST_USER_ID;
  if (testUserId) {
    const { data } = await db.from("profiles").select("id").eq("id", testUserId).single();
    if (data?.id) return data.id;
    return null;
  }

  const { data: rows } = await db.from("profiles").select("id").limit(10);
  return rows?.[0]?.id ?? null;
}

async function main() {
  console.log("\n--- US3 Checkpoint: HITL Verification for Submitted and Won ---\n");

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    console.log(`✗ US3 FAIL: Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const userId = await findTestUserId();
  if (!userId) {
    console.log("⚠ SKIP: No test profile. Set US3_TEST_USER_ID or run: pnpm setup-test-profile");
    process.exit(0);
  }

  const db = createDbClient();
  const runId = randomUUID().slice(0, 8);
  const baseUrl = `https://verify-us3-${runId}.local`;

  const { data: scholarship, error: schErr } = await db
    .from("scholarships")
    .insert({
      title: "US3 Verify Scholarship",
      deadline: "2025-06-01",
      trust_score: 80,
      url: baseUrl,
      category: "merit",
    })
    .select("id")
    .single();

  if (schErr || !scholarship?.id) {
    console.log(`✗ US3 FAIL: Failed to create scholarship: ${schErr?.message}`);
    process.exit(1);
  }

  const { data: app, error: appErr } = await db
    .from("applications")
    .insert({
      user_id: userId,
      scholarship_id: scholarship.id,
      academic_year: ACADEMIC_YEAR,
      status: "draft",
    })
    .select("id, status")
    .single();

  if (appErr || !app?.id) {
    console.log(`✗ US3 FAIL: Failed to create application: ${appErr?.message}`);
    await db.from("scholarships").delete().eq("id", scholarship.id);
    process.exit(1);
  }

  const applicationId = app.id;

  try {
    // 1. Decline Submitted — no DB changes
    const declineResult = await confirmOutcome({
      userId,
      applicationId,
      confirmed: false,
      outcomeType: "Submitted",
    });

    if ("code" in declineResult) {
      console.log(`✗ US3 FAIL: Decline should return result, not error: ${JSON.stringify(declineResult)}`);
      throw new Error("Decline returned error");
    }
    if (declineResult.success !== false || !declineResult.message) {
      console.log(`✗ US3 FAIL: Decline should return success: false and message`);
      throw new Error("Decline response invalid");
    }

    const { data: afterDecline } = await db
      .from("applications")
      .select("status, submitted_at")
      .eq("id", applicationId)
      .single();

    if (afterDecline?.status !== "draft" || afterDecline?.submitted_at) {
      console.log(`✗ US3 FAIL: After decline, status should remain draft and submitted_at null`);
      throw new Error("Decline mutated DB");
    }

    console.log("  ✓ Decline: no DB changes");

    // 2. Confirm Submitted — status → submitted, submitted_at set
    const submitResult = await confirmOutcome({
      userId,
      applicationId,
      confirmed: true,
      outcomeType: "Submitted",
    });

    if ("code" in submitResult) {
      console.log(`✗ US3 FAIL: Confirm Submitted failed: ${JSON.stringify(submitResult)}`);
      throw new Error("Confirm Submitted returned error");
    }
    if (!submitResult.success || submitResult.status !== "Submitted") {
      console.log(`✗ US3 FAIL: Confirm Submitted should return success and status Submitted`);
      throw new Error("Confirm Submitted response invalid");
    }

    const { data: afterSubmit } = await db
      .from("applications")
      .select("status, submitted_at")
      .eq("id", applicationId)
      .single();

    if (afterSubmit?.status !== "submitted" || !afterSubmit?.submitted_at) {
      console.log(`✗ US3 FAIL: After confirm Submitted, status=submitted and submitted_at set`);
      throw new Error("Confirm Submitted did not persist");
    }

    console.log("  ✓ Confirm Submitted: status=submitted, submitted_at set");

    // 3. Confirm Won — status → awarded, confirmed_at set
    const wonResult = await confirmOutcome({
      userId,
      applicationId,
      confirmed: true,
      outcomeType: "Won",
    });

    if ("code" in wonResult) {
      console.log(`✗ US3 FAIL: Confirm Won failed: ${JSON.stringify(wonResult)}`);
      throw new Error("Confirm Won returned error");
    }
    if (
      !wonResult.success ||
      wonResult.status !== "Won" ||
      wonResult.totalDebtLiftedUpdated !== true
    ) {
      console.log(
        `✗ US3 FAIL: Confirm Won should return success, status Won, totalDebtLiftedUpdated true`
      );
      throw new Error("Confirm Won response invalid");
    }

    const { data: afterWon } = await db
      .from("applications")
      .select("status, confirmed_at")
      .eq("id", applicationId)
      .single();

    if (afterWon?.status !== "awarded" || !afterWon?.confirmed_at) {
      console.log(`✗ US3 FAIL: After confirm Won, status=awarded and confirmed_at set`);
      throw new Error("Confirm Won did not persist");
    }

    console.log("  ✓ Confirm Won: status=awarded, confirmed_at set, totalDebtLiftedUpdated=true");

    console.log("\n✓ US3 PASS: HITL verification for Submitted and Won verified");
    console.log("");
  } finally {
    await db.from("applications").delete().eq("id", applicationId);
    await db.from("scholarships").delete().eq("id", scholarship.id);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
