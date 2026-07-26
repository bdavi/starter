import { test, expect } from "@playwright/test";

// @critical: runs on every CI push (ADR-00007). Keep this tag for anything
// that must never break — signup, auth, checkout, etc. as they're added.
// Untagged tests only run in the full on-demand suite.
test("renders the home page", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("Hello, world");
});
