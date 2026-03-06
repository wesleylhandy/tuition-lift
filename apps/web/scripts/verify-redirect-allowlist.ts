#!/usr/bin/env tsx
/**
 * T017: Verify redirectTo allowlist — rejects malicious inputs.
 * getSafeRedirectTo must reject //, javascript:, data:, external URLs.
 *
 * Run: pnpm --filter web verify:redirect-allowlist
 *
 * @see specs/012-auth-bridge-protected-routing/contracts/redirect-allowlist.md
 */
import { getSafeRedirectTo } from "../lib/auth/redirect-allowlist";

const DEFAULT = "/onboard";

type Case = { input: string | null | undefined; expect: string; label: string };

const cases: Case[] = [
  // Allowed
  { input: "/dashboard", expect: "/dashboard", label: "allowed /dashboard" },
  { input: "/dashboard/settings", expect: "/dashboard/settings", label: "allowed /dashboard/*" },
  { input: "/scout", expect: "/scout", label: "allowed /scout" },
  { input: "/scout/search", expect: "/scout/search", label: "allowed /scout/*" },
  { input: "/onboard", expect: "/onboard", label: "allowed /onboard" },
  // Rejected: protocol-relative
  { input: "//evil.com/path", expect: DEFAULT, label: "reject //" },
  { input: "//example.com/dashboard", expect: DEFAULT, label: "reject // with path" },
  // Rejected: schemes
  { input: "javascript:alert(1)", expect: DEFAULT, label: "reject javascript:" },
  { input: "JavaScript:void(0)", expect: DEFAULT, label: "reject JavaScript: (case)" },
  { input: "data:text/html,<script>", expect: DEFAULT, label: "reject data:" },
  // Rejected: external URLs (no leading /)
  { input: "https://evil.com/dashboard", expect: DEFAULT, label: "reject https:" },
  { input: "http://phish.example/dashboard", expect: DEFAULT, label: "reject http:" },
  // Rejected: empty/invalid
  { input: null, expect: DEFAULT, label: "null returns default" },
  { input: undefined, expect: DEFAULT, label: "undefined returns default" },
  { input: "", expect: DEFAULT, label: "empty string returns default" },
  { input: "  ", expect: DEFAULT, label: "whitespace returns default" },
  // Rejected: non-allowlisted path
  { input: "/admin", expect: DEFAULT, label: "reject /admin" },
  { input: "/dashboardx", expect: DEFAULT, label: "reject /dashboardx (no prefix)" },
];

function main(): void {
  console.log("\n--- T017: Redirect Allowlist Verification ---\n");

  let failed = 0;
  for (const { input, expect, label } of cases) {
    const got = getSafeRedirectTo(input, DEFAULT);
    if (got !== expect) {
      console.error(`✗ ${label}: got "${got}", expected "${expect}"`);
      failed++;
    } else {
      console.log(`✓ ${label}`);
    }
  }

  if (failed > 0) {
    console.error(`\n✗ FAIL: ${failed} case(s) failed`);
    process.exit(1);
  }
  console.log(`\n✓ PASS: All ${cases.length} cases passed\n`);
}

main();
