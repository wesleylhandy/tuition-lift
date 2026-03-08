/**
 * T040: E2E — Expand each widget, verify expanded view, close via button and Escape.
 * Spec 013 Phase 9; quickstart.md verification.
 */
import { expect, test } from "@playwright/test";

const WIDGETS = [
  { id: "kanban", title: "Today's Game Plan", expandedHint: "To Do" },
  { id: "repository", title: "Discovery Feed", expandedHint: "Search" },
  { id: "calendar", title: "Deadline Calendar", expandedHint: "Jan" },
] as const;

test.describe("Expand and collapse bento widgets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  for (const { title, expandedHint } of WIDGETS) {
    test(`expand ${title} via expand control`, async ({ page }) => {
      const section = page.getByRole("region", { name: title });
      await expect(section).toBeVisible();

      const expandBtn = section.getByRole("button", { name: `Expand ${title}` });
      await expect(expandBtn).toBeVisible();

      await expandBtn.click();

      const overlay = page.getByRole("dialog", { name: `${title} expanded` });
      await expect(overlay).toBeVisible();

      await expect(page.getByText(expandedHint, { exact: false })).toBeVisible({
        timeout: 5000,
      });
    });

    test(`close ${title} via close button`, async ({ page }) => {
      const section = page.getByRole("region", { name: title });
      const expandBtn = section.getByRole("button", { name: `Expand ${title}` });
      await expandBtn.click();

      const overlay = page.getByRole("dialog", { name: `${title} expanded` });
      await expect(overlay).toBeVisible();

      const closeBtn = page.getByRole("button", {
        name: "Close and return to dashboard",
      });
      await closeBtn.click();

      await expect(overlay).not.toBeVisible();
    });

    test(`close ${title} via Escape key`, async ({ page }) => {
      const section = page.getByRole("region", { name: title });
      const expandBtn = section.getByRole("button", { name: `Expand ${title}` });
      await expandBtn.click();

      const overlay = page.getByRole("dialog", { name: `${title} expanded` });
      await expect(overlay).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(overlay).not.toBeVisible();
    });
  }

  test("expand controls are keyboard accessible and meet 44px target", async ({
    page,
  }) => {
    const section = page.getByRole("region", { name: "Today's Game Plan" });
    const expandBtn = section.getByRole("button", {
      name: "Expand Today's Game Plan",
    });

    await expandBtn.focus();
    await expect(expandBtn).toBeFocused();

    const box = await expandBtn.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});
