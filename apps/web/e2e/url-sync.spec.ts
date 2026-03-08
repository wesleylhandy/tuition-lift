/**
 * T041: E2E — URL with ?view=kanban loads expanded; back button returns to dashboard.
 * Spec 013 Phase 9; quickstart.md verification.
 */
import { expect, test } from "@playwright/test";

test.describe("Shareable links and back-button support", () => {
  test("?view=kanban loads Kanban expanded directly", async ({ page }) => {
    await page.goto("/dashboard?view=kanban");

    const overlay = page.getByRole("dialog", {
      name: "Today's Game Plan expanded",
    });
    await expect(overlay).toBeVisible({ timeout: 5000 });

    await expect(page).toHaveURL(/view=kanban/);
  });

  test("?view=repository loads Repository expanded directly", async ({
    page,
  }) => {
    await page.goto("/dashboard?view=repository");

    const overlay = page.getByRole("dialog", {
      name: "Discovery Feed expanded",
    });
    await expect(overlay).toBeVisible({ timeout: 5000 });

    await expect(page).toHaveURL(/view=repository/);
  });

  test("?view=calendar loads Calendar expanded directly", async ({
    page,
  }) => {
    await page.goto("/dashboard?view=calendar");

    const overlay = page.getByRole("dialog", {
      name: "Deadline Calendar expanded",
    });
    await expect(overlay).toBeVisible({ timeout: 5000 });

    await expect(page).toHaveURL(/view=calendar/);
  });

  test("invalid view param shows dashboard (no expanded overlay)", async ({
    page,
  }) => {
    await page.goto("/dashboard?view=invalid");

    const overlay = page.getByRole("dialog");
    await expect(overlay).not.toBeVisible();
  });

  test("back button returns to expanded view after close", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const section = page.getByRole("region", { name: "Today's Game Plan" });
    const expandBtn = section.getByRole("button", {
      name: "Expand Today's Game Plan",
    });
    await expandBtn.click();

    await expect(page).toHaveURL(/view=kanban/);

    const closeBtn = page.getByRole("button", {
      name: "Close and return to dashboard",
    });
    await closeBtn.click();

    await expect(page).toHaveURL(/\/dashboard/);

    await page.goBack();

    await expect(page).toHaveURL(/view=kanban/);
    const overlay = page.getByRole("dialog", {
      name: "Today's Game Plan expanded",
    });
    await expect(overlay).toBeVisible();
  });
});
