/**
 * Teardown placeholder for auth setup project.
 * Playwright requires teardown to be a test file; this satisfies the dependency.
 */
import { test } from "@playwright/test";

test("cleanup", async () => {
  // No-op; storageState persists for debugging. Add cleanup if needed.
});
