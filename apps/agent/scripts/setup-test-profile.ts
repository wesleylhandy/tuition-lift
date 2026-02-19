#!/usr/bin/env node
/**
 * Setup a test profile for local agent discovery testing.
 * Creates an auth user (if needed) and profile in Supabase so verify-sc001 and discovery flows can run.
 *
 * profiles.id must reference auth.users(id), so we create a real auth user via admin API.
 *
 * Prerequisites:
 *   - .env at repo root with: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *     SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY (openssl rand -base64 32)
 *
 * Usage:
 *   pnpm setup-test-profile
 *   SETUP_TEST_PROFILE_ID=uuid pnpm setup-test-profile   # use existing auth user ID
 *
 * After running, use the printed user ID with: SC001_TEST_USER_ID=<id> pnpm verify-sc001
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createDbClient, withEncryptedSai } from "@repo/db";

const DEFAULT_MAJOR = "Computer Science";
const DEFAULT_STATE = "CA";
const DEFAULT_GPA = 3.5;
const DEFAULT_SAI = 2000; // Moderate bracket; Pell-eligible threshold
const DEFAULT_PELL = "eligible" as const;
const TEST_EMAIL_DOMAIN = "test.tuitionlift.local";

async function getOrCreateUserId(db: ReturnType<typeof createDbClient>): Promise<string> {
  const existingId = process.env.SETUP_TEST_PROFILE_ID;
  if (existingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingId)) {
    return existingId;
  }

  const email = `discovery-test-${Date.now()}@${TEST_EMAIL_DOMAIN}`;
  const password = randomUUID();
  const { data: user, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: "local-discovery-testing" },
  });

  if (authError || !user?.user?.id) {
    throw new Error(
      `Failed to create auth user: ${authError?.message ?? "Unknown error"}`
    );
  }

  return user.user.id;
}

async function main() {
  const db = createDbClient();
  const profileId = await getOrCreateUserId(db);

  const payload = withEncryptedSai({
    id: profileId,
    intended_major: DEFAULT_MAJOR,
    state: DEFAULT_STATE,
    gpa_unweighted: DEFAULT_GPA,
    sai: DEFAULT_SAI,
    pell_eligibility_status: DEFAULT_PELL,
    full_name: "Test User (PII scrub verification)",
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await db
    .from("profiles")
    .upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    })
    .select("id, intended_major, state, gpa_unweighted")
    .single();

  if (error) {
    console.error("Failed to upsert profile:", error.message);
    process.exit(1);
  }

  console.log("\n--- Test profile ready ---\n");
  console.log(`  ID:       ${data?.id ?? profileId}`);
  console.log(`  Major:    ${data?.intended_major ?? DEFAULT_MAJOR}`);
  console.log(`  State:    ${data?.state ?? DEFAULT_STATE}`);
  console.log(`  GPA:      ${data?.gpa_unweighted ?? DEFAULT_GPA}`);
  console.log(`  SAI:      ${DEFAULT_SAI} (encrypted, Moderate bracket)`);
  console.log(`  Pell:     ${DEFAULT_PELL}`);
  console.log("");
  console.log("Run discovery verification:");
  console.log(`  SC001_TEST_USER_ID=${data?.id ?? profileId} pnpm verify-sc001`);
  console.log("");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
