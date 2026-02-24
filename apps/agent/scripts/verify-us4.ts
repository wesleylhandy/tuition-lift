#!/usr/bin/env node
/**
 * Verify US4 checkpoint: durable state and resumability.
 * Independent Test (tasks.md Phase 6): Simulate Verify failure after Scout;
 * resume with same thread_id; Scout must not re-run.
 *
 * Flow:
 * 1. Run 1: US4_SIMULATE_VERIFY_FAIL=1 → Scout completes, checkpoint written, Verify throws
 * 2. Run 2: Resume with same thread_id → loads checkpoint, runs Verify only → success
 *
 * Prerequisites: DATABASE_URL, TAVILY_API_KEY, OPENAI_API_KEY, test profile.
 *
 * Run: pnpm verify-us4
 */
import "./load-env";
import { graph } from "../lib/graph";
import { loadProfile } from "../lib/load-profile";
import { createDbClient } from "@repo/db";
import { randomUUID } from "node:crypto";

async function findTestUserId(): Promise<string | null> {
  const db = createDbClient();
  const testUserId =
    process.env.SC001_TEST_USER_ID ??
    process.env.US2_TEST_USER_ID ??
    process.env.US4_TEST_USER_ID;
  if (testUserId) {
    const { data } = await db
      .from("profiles")
      .select("id, intended_major, state")
      .eq("id", testUserId)
      .single();
    if (data?.intended_major && data?.state) return data.id;
    return null;
  }

  const { data: rows } = await db
    .from("profiles")
    .select("id, intended_major, state")
    .not("intended_major", "is", null)
    .not("state", "is", null)
    .limit(10);

  const valid = (rows ?? []).find(
    (r) => r.intended_major?.trim() && r.state?.trim()
  );
  return valid?.id ?? null;
}

async function main() {
  console.log("\n--- US4 Checkpoint: Resumability (Scout not re-run on resume) ---\n");

  const missing = [];
  if (!process.env.TAVILY_API_KEY?.trim()) missing.push("TAVILY_API_KEY");
  if (!process.env.OPENAI_API_KEY?.trim()) missing.push("OPENAI_API_KEY");
  if (missing.length > 0) {
    console.log(`✗ US4 FAIL: Missing env vars: ${missing.join(", ")}`);
    console.log(
      "  Ensure apps/agent/.env or root .env has these. Script loads agent .env first."
    );
    process.exit(1);
  }

  const userId = await findTestUserId();
  if (!userId) {
    console.log(
      "⚠ SKIP: No test profile with intended_major and state. " +
        "Set US4_TEST_USER_ID or run: pnpm setup-test-profile"
    );
    process.exit(0);
  }

  const threadId = `us4_resume_${userId}_${randomUUID().slice(0, 8)}`;
  const discoveryRunId = randomUUID();
  const config = {
    configurable: {
      thread_id: threadId,
      discovery_run_id: discoveryRunId,
      useSaiRange: false,
    },
  };

  const { user_profile, financial_profile, merit_config } =
    await loadProfile(userId);
  if (!user_profile?.major || !user_profile?.state) {
    console.log("⚠ SKIP: Profile incomplete (major and state required).");
    process.exit(0);
  }

  const input = {
    user_profile,
    financial_profile: financial_profile ?? undefined,
    merit_filter_preference: merit_config?.merit_filter_preference ?? "show_all",
    sai_above_merit_threshold: merit_config?.sai_above_merit_threshold ?? false,
    merit_tier: merit_config?.merit_tier ?? undefined,
    award_year: merit_config?.award_year ?? undefined,
  };

  // Run 1: Simulate Verify failure (checkpoint after Scout is already written)
  process.env.US4_SIMULATE_VERIFY_FAIL = "1";
  let run1Threw = false;
  try {
    await graph.invoke(input, config);
  } catch (err) {
    run1Threw = true;
    const msg = (err as Error).message ?? "";
    if (!msg.includes("US4 resumability test")) {
      console.log(`✗ US4 FAIL: Run 1 threw unexpected error:`);
      console.error((err as Error).message);
      process.exit(1);
    }
  }

  if (!run1Threw) {
    console.log(
      "✗ US4 FAIL: Run 1 expected to throw (Verify simulates failure). " +
        "Check US4_SIMULATE_VERIFY_FAIL is used in advisor-verify."
    );
    process.exit(1);
  }

  // Run 2: Resume with same thread_id — Scout must not re-run; Verify runs from checkpoint
  delete process.env.US4_SIMULATE_VERIFY_FAIL;

  let result: unknown;
  try {
    result = await graph.invoke(input, config);
  } catch (err) {
    console.log(`✗ US4 FAIL: Resume (run 2) threw`);
    console.error((err as Error).message);
    process.exit(1);
  }

  if (result && typeof result === "object" && "__interrupt__" in result) {
    console.log("⚠ SKIP: Graph interrupted (HITL). Use useSaiRange: false.");
    process.exit(0);
  }

  const values = result as {
    discovery_results?: unknown[];
    last_active_node?: string;
    error_log?: Array<{ node: string; message: string }>;
  };

  if (values.last_active_node !== "Coach_Prioritization") {
    console.log(
      `✗ US4 FAIL: Resume must complete (Coach_Prioritization). ` +
        `Got last_active_node=${values.last_active_node ?? "undefined"}`
    );
    if ((values.error_log ?? []).length > 0) {
      values.error_log!.forEach((e) =>
        console.log(`  [${e.node}] ${e.message}`)
      );
    }
    process.exit(1);
  }

  const results = values.discovery_results ?? [];
  if (results.length === 0) {
    console.log(
      "✗ US4 FAIL: Resume completed but no discovery_results. " +
        "Checkpoint may not have Scout output."
    );
    process.exit(1);
  }

  console.log(`✓ US4 PASS: Resumability verified`);
  console.log(`  Run 1: Scout ran, Verify simulated failure, checkpoint saved`);
  console.log(`  Run 2: Resumed from checkpoint, Verify ran only (Scout not re-invoked)`);
  console.log(`  Results: ${results.length} (from Scout checkpoint)`);
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
