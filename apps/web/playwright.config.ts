/**
 * Playwright E2E config for dashboard expandable widget flows.
 * Spec 013 Phase 9: T040 (expand/collapse), T041 (URL sync).
 *
 * Auth: Run setup project first. Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.
 * Usage: pnpm test:e2e
 */
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: ".env.test" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "cleanup",
      testMatch: /auth\.teardown\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  // Start dev server only in CI. Locally: run `pnpm dev` or `pnpm start` first.
  webServer: process.env.CI
    ? {
        command: "pnpm --filter web dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
});
