/**
 * Auth setup for dashboard E2E tests.
 * Logs in via /login and saves storageState for reuse.
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.
 */
import { test as setup } from "@playwright/test";
import * as path from "node:path";

const authFile = path.join(".auth", "user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E auth setup requires TEST_USER_EMAIL and TEST_USER_PASSWORD. " +
        "Create .env.test with a test user that has onboarding_complete=true."
    );
  }

  await page.goto("/login?redirectTo=/dashboard");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
