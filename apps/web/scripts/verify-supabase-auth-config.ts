#!/usr/bin/env tsx
/**
 * T002: Verify Supabase Auth config prerequisites.
 * Validates env vars and outputs expected callback URLs for Supabase Dashboard.
 *
 * Run: pnpm --filter web verify:supabase-auth
 *
 * Dashboard checks (manual): Email + Magic Link enabled; Site URL; Redirect URLs.
 * See specs/012-auth-bridge-protected-routing/SUPABASE_AUTH_VERIFICATION.md
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(webRoot, "../..");
config({ path: resolve(workspaceRoot, ".env") });
config({ path: resolve(webRoot, ".env"), override: true });

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function main(): void {
  console.log("\n--- T002: Supabase Auth Config Verification ---\n");

  const missing = REQUIRED.filter(
    (k) => !process.env[k]?.trim()
  );
  if (missing.length > 0) {
    console.error(`✗ FAIL: Missing env vars: ${missing.join(", ")}`);
    console.error("  Set in apps/web/.env or repo root .env");
    process.exit(1);
  }

  // Infer dev origin; production must be configured per deploy
  const localhost = "http://localhost:3000";
  const callbackLocal = `${localhost}/auth/callback`;

  console.log("✓ Env vars present: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n");

  console.log("Redirect URLs to add in Supabase Dashboard → Authentication → URL Configuration:\n");
  console.log(`  • ${callbackLocal}  (development)`);

  if (process.env.VERCEL_URL) {
    const previewOrigin = `https://${process.env.VERCEL_URL}`;
    console.log(`  • ${previewOrigin}/auth/callback  (Vercel preview)`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (siteUrl) {
    const origin = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    console.log(`  • ${origin}/auth/callback  (production)`);
  } else {
    console.log(`  • {your-production-origin}/auth/callback  (add your production URL)`);
  }

  console.log("\nSite URL: Must match app origin (e.g. http://localhost:3000 for dev).");
  console.log("Providers: Email + Magic Link must be enabled.\n");
  console.log("Full checklist: specs/012-auth-bridge-protected-routing/SUPABASE_AUTH_VERIFICATION.md\n");
}

main();
