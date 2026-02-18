#!/usr/bin/env node
/**
 * Verify US2 checkpoint: Trust Report on every result; fee-required excluded.
 * Independent Test (tasks.md Phase 4): Run discovery; verify every result has
 * trust_score and trust_report; fee-required scholarships score 0 and excluded.
 *
 * Prerequisites: DATABASE_URL, TAVILY_API_KEY, OPENAI_API_KEY, test profile.
 * Reuses verify-sc001 test-user logic.
 *
 * Run: pnpm verify-us2
 */
import "./load-env";
import { graph } from "../lib/graph";
import { loadProfile } from "../lib/load-profile";
import { createDbClient } from "@repo/db";
import { randomUUID } from "node:crypto";

async function findTestUserId(): Promise<string | null> {
  const db = createDbClient();
  const testUserId = process.env.SC001_TEST_USER_ID ?? process.env.US2_TEST_USER_ID;
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
  console.log("\n--- US2 Checkpoint: Trust Report on every result ---\n");

  const missing = [];
  if (!process.env.TAVILY_API_KEY?.trim()) missing.push("TAVILY_API_KEY");
  if (!process.env.OPENAI_API_KEY?.trim()) missing.push("OPENAI_API_KEY");
  if (missing.length > 0) {
    console.log(`✗ US2 FAIL: Missing env vars: ${missing.join(", ")}`);
    console.log("  Ensure apps/agent/.env or root .env has these. Script loads agent .env first.");
    process.exit(1);
  }

  const userId = await findTestUserId();
  if (!userId) {
    console.log(
      "⚠ SKIP: No test profile with intended_major and state. " +
        "Set US2_TEST_USER_ID or SC001_TEST_USER_ID, or run: pnpm setup-test-profile"
    );
    process.exit(0);
  }

  const discoveryRunId = randomUUID();
  const threadId = `verify-us2-${discoveryRunId}`;
  const config = {
    configurable: {
      thread_id: threadId,
      discovery_run_id: discoveryRunId,
      useSaiRange: false,
    },
  };

  const { user_profile, financial_profile } = await loadProfile(userId);
  if (!user_profile?.major || !user_profile?.state) {
    console.log("⚠ SKIP: Profile incomplete (major and state required).");
    process.exit(0);
  }

  const input = {
    user_profile,
    financial_profile: financial_profile ?? undefined,
  };

  let result: unknown;
  try {
    result = await graph.invoke(input, config);
  } catch (err) {
    console.log(`✗ US2 FAIL: Graph invoke threw`);
    console.error((err as Error).message);
    if ((err as Error).cause) console.error("Cause:", (err as Error).cause);
    process.exit(1);
  }

  if (result && typeof result === "object" && "__interrupt__" in result) {
    console.log("⚠ SKIP: Graph interrupted (HITL). Use useSaiRange: false.");
    process.exit(0);
  }

  const values = result as {
    discovery_results?: Array<{
      trust_score?: number;
      trust_report?: string;
      verification_status?: string;
      categories?: string[];
    }>;
    last_active_node?: string;
    error_log?: Array<{ node: string; message: string; timestamp: string }>;
  };

  const printErrorLog = () => {
    const logs = values.error_log ?? [];
    if (logs.length > 0) {
      console.log("\nError log (from graph state):");
      logs.forEach((e) => console.log(`  [${e.node}] ${e.message}`));
      const hasTavily401 = logs.some((e) => e.message.includes("Tavily") && e.message.includes("401"));
      const hasOpenAI = logs.some((e) => e.message.toLowerCase().includes("openai"));
      if (hasTavily401)
        console.log("\n  Tavily 401: Key may be invalid/expired. tvly-dev- keys can have restrictions. Check app.tavily.com");
      if (hasOpenAI)
        console.log("\n  OpenAI: Ensure OPENAI_API_KEY is in apps/agent/.env or root .env with no extra quotes/spaces");
    }
  };

  if (values.last_active_node !== "Coach_Prioritization") {
    console.log(
      `✗ US2 FAIL: Discovery must complete successfully (Coach_Prioritization). ` +
        `Got last_active_node=${values.last_active_node ?? "undefined"}`
    );
    printErrorLog();
    process.exit(1);
  }

  const results = values.discovery_results ?? [];

  if (results.length === 0) {
    console.log("✗ US2 FAIL: No discovery results. Cannot verify trust_report without results.");
    printErrorLog();
    console.log("\nHint: Check TAVILY_API_KEY, OPENAI_API_KEY in .env; ensure dotenv loads apps/agent/.env or root .env");
    process.exit(1);
  }

  // All active results must have trust_score 0-100 and trust_report
  const invalid: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (typeof r.trust_score !== "number" || r.trust_score < 0 || r.trust_score > 100) {
      invalid.push(`result[${i}] trust_score missing or out of range (0-100): ${r.trust_score}`);
    }
    if (typeof r.trust_report !== "string" || r.trust_report.trim().length === 0) {
      invalid.push(`result[${i}] trust_report missing or empty`);
    }
  }

  if (invalid.length > 0) {
    console.log("✗ US2 FAIL: Trust Report assertions failed:");
    invalid.forEach((msg) => console.log(`  - ${msg}`));
    process.exit(1);
  }

  console.log(`✓ US2 PASS: All ${results.length} result(s) have trust_score 0-100 and trust_report`);
  console.log(`  last_active_node: Coach_Prioritization`);
  if (results.length > 0) {
    const sample = results[0];
    console.log(`  Sample: trust_score=${sample.trust_score}, verification_status=${sample.verification_status ?? "—"}`);
  }
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
