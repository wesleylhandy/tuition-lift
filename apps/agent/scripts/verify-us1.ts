#!/usr/bin/env node
/**
 * Verify US1: Daily Top 3 Game Plan (005 Coach Execution Engine).
 * Independent Test (tasks.md Phase 3): Supply applications with varying deadlines/trust
 * scores; trigger batch; verify Top 3 respects Momentum Score formula. Zero apps → suggestion.
 *
 * Prerequisites: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, test profile (or US1_TEST_USER_ID).
 *
 * Run: pnpm verify-us1
 */
import "./load-env";
import { createDbClient } from "@repo/db";
import { runGamePlanBatch, getGamePlanForUser } from "../lib/coach/game-plan";
import { randomUUID } from "node:crypto";

const ACADEMIC_YEAR = "2025-2026";

async function findTestUserId(): Promise<string | null> {
  const db = createDbClient();
  const testUserId =
    process.env.US1_TEST_USER_ID ??
    process.env.SC001_TEST_USER_ID ??
    process.env.US2_TEST_USER_ID;
  if (testUserId) {
    const { data } = await db
      .from("profiles")
      .select("id")
      .eq("id", testUserId)
      .single();
    if (data?.id) return data.id;
    return null;
  }

  const { data: rows } = await db
    .from("profiles")
    .select("id")
    .limit(10);

  return rows?.[0]?.id ?? null;
}

async function main() {
  console.log("\n--- US1 Checkpoint: Daily Top 3 Game Plan ---\n");

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    console.log(`✗ US1 FAIL: Missing env vars: ${missing.join(", ")}`);
    console.log(
      "  Set in .env at repo root or apps/web/.env (scripts load apps/agent/.env)"
    );
    process.exit(1);
  }

  const userId = await findTestUserId();
  if (!userId) {
    console.log(
      "⚠ SKIP: No test profile. Set US1_TEST_USER_ID or run: pnpm setup-test-profile"
    );
    process.exit(0);
  }

  const db = createDbClient();
  const runId = randomUUID().slice(0, 8);
  const baseUrl = `https://verify-us1-${runId}.local`;

  // Seed 3 scholarships: varying deadlines and trust scores for momentum ordering
  // Near deadline + high trust = highest momentum; far + low = lowest
  const scholarships = [
    {
      title: "US1 Verify Scholarship A (Near, High Trust)",
      deadline: "2025-03-01", // ~2 weeks out
      trust_score: 90,
      url: `${baseUrl}/a`,
    },
    {
      title: "US1 Verify Scholarship B (Far, Low Trust)",
      deadline: "2025-08-15", // ~6 months out
      trust_score: 30,
      url: `${baseUrl}/b`,
    },
    {
      title: "US1 Verify Scholarship C (Mid, Mid Trust)",
      deadline: "2025-05-15", // ~3 months out
      trust_score: 60,
      url: `${baseUrl}/c`,
    },
  ];

  const scholarshipIds: string[] = [];

  try {
    for (const s of scholarships) {
      const { data, error } = await db
        .from("scholarships")
        .insert({
          title: s.title,
          deadline: s.deadline,
          trust_score: s.trust_score,
          url: s.url,
          category: "merit",
        })
        .select("id")
        .single();
      if (error) {
        throw new Error(`Failed to insert scholarship: ${error.message}`);
      }
      if (data?.id) scholarshipIds.push(data.id);
    }

    if (scholarshipIds.length !== 3) {
      throw new Error(
        `Expected 3 scholarships, got ${scholarshipIds.length}`
      );
    }

    // Create applications for test user
    const applicationIds: string[] = [];
    for (const scholarshipId of scholarshipIds) {
      const { data, error } = await db
        .from("applications")
        .insert({
          user_id: userId,
          scholarship_id: scholarshipId,
          academic_year: ACADEMIC_YEAR,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) {
        throw new Error(`Failed to insert application: ${error.message}`);
      }
      if (data?.id) applicationIds.push(data.id);
    }

    if (applicationIds.length !== 3) {
      throw new Error(
        `Expected 3 applications, got ${applicationIds.length}`
      );
    }

    // 1. Run game plan batch — should persist momentum_score
    let batchResult;
    try {
      batchResult = await runGamePlanBatch();
    } catch (err) {
      console.log("✗ US1 FAIL: runGamePlanBatch threw");
      console.error((err as Error).message);
      throw err;
    }

    if (batchResult.updated < 3) {
      console.log(
        `✗ US1 FAIL: Expected batch to update at least 3 applications, got ${batchResult.updated}`
      );
      throw new Error("Batch update count mismatch");
    }

    // 2. Verify momentum_score persisted and ordering
    const { data: appsAfter } = await db
      .from("applications")
      .select("id, momentum_score")
      .in("id", applicationIds);

    const withScore = (appsAfter ?? []).filter(
      (a) => typeof a.momentum_score === "number"
    );
    if (withScore.length < 3) {
      console.log(
        `✗ US1 FAIL: Expected 3 applications with momentum_score, got ${withScore.length}`
      );
      throw new Error("momentum_score not persisted");
    }

    // 3. getGamePlanForUser — Top 3 ordered by momentum desc
    const gamePlan = await getGamePlanForUser(userId);

    if (gamePlan.top3.length < 3) {
      console.log(
        `✗ US1 FAIL: Expected Top 3 with 3 items, got ${gamePlan.top3.length}`
      );
      throw new Error("Top 3 length mismatch");
    }

    // Verify descending order
    for (let i = 1; i < gamePlan.top3.length; i++) {
      if (gamePlan.top3[i]!.momentumScore > gamePlan.top3[i - 1]!.momentumScore) {
        console.log(
          `✗ US1 FAIL: Top 3 not ordered by momentum desc. ` +
            `[${i - 1}]=${gamePlan.top3[i - 1]!.momentumScore} < [${i}]=${gamePlan.top3[i]!.momentumScore}`
        );
        throw new Error("Top 3 order violation");
      }
    }

    // 4. Zero-apps path — user with no applications gets suggestion
    const zeroAppsUserId = randomUUID();
    const zeroAppsPlan = await getGamePlanForUser(zeroAppsUserId);

    if (zeroAppsPlan.top3.length > 0) {
      console.log(
        `✗ US1 FAIL: Zero-apps user should have empty top3, got ${zeroAppsPlan.top3.length}`
      );
      throw new Error("Zero-apps top3 should be empty");
    }
    if (
      !zeroAppsPlan.suggestion ||
      !zeroAppsPlan.suggestion.toLowerCase().includes("add applications")
    ) {
      console.log(
        `✗ US1 FAIL: Zero-apps suggestion missing or wrong. Got: ${zeroAppsPlan.suggestion}`
      );
      throw new Error("Zero-apps suggestion violation");
    }

    console.log("✓ US1 PASS: Daily Top 3 Game Plan verified");
    console.log(`  runGamePlanBatch: processed=${batchResult.processed}, updated=${batchResult.updated}`);
    console.log(`  Top 3 order (momentum desc):`);
    gamePlan.top3.forEach((item, i) => {
      console.log(
        `    ${i + 1}. ${item.scholarshipTitle.slice(0, 40)}... score=${item.momentumScore}`
      );
    });
    console.log(`  Zero-apps suggestion: "${zeroAppsPlan.suggestion.slice(0, 50)}..."`);
    console.log("");
  } finally {
    // Cleanup: delete test applications first (FK), then scholarships
    if (scholarshipIds.length > 0) {
      const { data: appIds } = await db
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .in("scholarship_id", scholarshipIds);

      if (appIds?.length) {
        await db
          .from("applications")
          .delete()
          .in("id", appIds.map((a) => a.id));
      }

      for (const sid of scholarshipIds) {
        await db.from("scholarships").delete().eq("id", sid);
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
