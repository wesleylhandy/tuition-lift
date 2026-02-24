#!/usr/bin/env node
/**
 * Verify SC-001: discovery end-to-end completes within 5 minutes.
 * Runs graph.invoke directly (same path as Inngest discovery function).
 * Single-user, sequential conditions per spec.
 *
 * Prerequisites: DATABASE_URL, test profile with intended_major and state.
 * Optional: SC001_TEST_USER_ID — specific user to test; else uses first valid profile.
 *
 * Run: pnpm verify-sc001
 */
import "dotenv/config";
import { graph } from "../lib/graph";
import { loadProfile } from "../lib/load-profile";
import { createDbClient } from "@repo/db";
import { randomUUID } from "node:crypto";

const SC001_SLA_MS = 5 * 60 * 1000; // 5 minutes

async function findTestUserId(): Promise<string | null> {
  const db = createDbClient();
  const testUserId = process.env.SC001_TEST_USER_ID;
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

  const valid = (rows ?? []).find((r) => r.intended_major?.trim() && r.state?.trim());
  return valid?.id ?? null;
}

async function main() {
  console.log("\n--- SC-001 Verification: Discovery E2E within 5 min ---\n");

  const userId = await findTestUserId();
  if (!userId) {
    console.log(
      "⚠ SKIP: No test profile with intended_major and state. " +
        "Set SC001_TEST_USER_ID or add a profile, then run again."
    );
    process.exit(0);
  }

  const threadId = `user_${userId}`;
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
    console.log(
      "⚠ SKIP: Profile incomplete (major and state required). Fix profile and run again."
    );
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

  const start = Date.now();
  let result: unknown;
  try {
    result = await graph.invoke(input, config);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`✗ Graph invoke failed after ${(elapsed / 1000).toFixed(1)}s`);
    console.error((err as Error).message);
    process.exit(1);
  }

  const elapsed = Date.now() - start;

  if (result && typeof result === "object" && "__interrupt__" in result) {
    console.log(
      "⚠ SKIP: Graph interrupted (HITL). Use useSaiRange: false — rerun with normal flow."
    );
    process.exit(0);
  }

  const values = (result as { last_active_node?: string }) ?? {};
  const lastNode = values.last_active_node;

  if (elapsed > SC001_SLA_MS) {
    console.log(
      `✗ SC-001 FAIL: Discovery took ${(elapsed / 1000).toFixed(1)}s (max 300s)`
    );
    process.exit(1);
  }

  const terminalNodes = ["Coach_Prioritization", "SafeRecovery"];
  if (!lastNode || !terminalNodes.includes(lastNode)) {
    console.log(`✗ SC-001 FAIL: Did not reach terminal node; last_active_node=${lastNode ?? "undefined"}`);
    process.exit(1);
  }

  console.log(`✓ SC-001 PASS: Discovery completed in ${(elapsed / 1000).toFixed(1)}s (within 5 min)`);
  console.log(`  last_active_node: ${lastNode}`);
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
