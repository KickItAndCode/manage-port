import { test, expect, type Page } from "@playwright/test";

/**
 * Guards against server/client render mismatches.
 *
 * A hydration error was seen once on /dashboard during a test run. It has not
 * reproduced since, across many runs on an untouched dev server. The most
 * likely cause is Fast Refresh: source files were being edited while that run
 * was navigating, and recompiling mid-navigation produces exactly "server
 * rendered HTML didn't match the client". That is a development artifact, not
 * something a user would hit.
 *
 * Two candidates were investigated and ruled out, which is worth recording so
 * nobody re-treads it:
 *
 *  - ResponsiveSidebar reads localStorage in a useState initializer, which is
 *    the classic cause. It cannot mismatch here because the component returns
 *    null until mounted, so the server and the first client render agree on
 *    rendering nothing.
 *  - The documents page seeds its search box from sessionStorage the same way.
 *    It cannot mismatch either, because every data page server-renders a
 *    loading skeleton — Convex data is never available during SSR — so the
 *    input is not in the server output at all.
 *
 * These tests seed the client-only state that would trigger a mismatch if
 * either guard were removed. They pass today; their value is failing if
 * somebody drops the mounted check or starts server-rendering real data.
 */

function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  const record = (text: string) => {
    if (/hydrat|server rendered HTML didn't match/i.test(text)) errors.push(text);
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") record(msg.text());
  });
  page.on("pageerror", (error) => record(String(error)));
  return errors;
}

for (const collapsed of [true, false]) {
  test(`dashboard hydrates cleanly with the sidebar ${collapsed ? "collapsed" : "expanded"}`, async ({
    page,
  }) => {
    // Seeded before any app code runs, so the first render is the risky one.
    await page.addInitScript((value) => {
      window.localStorage.setItem("sidebarCollapsed", String(value));
    }, collapsed);

    const errors = collectHydrationErrors(page);

    await page.goto("/dashboard");
    await expect(
      page.locator("main").getByRole("heading", { name: "Dashboard" }).first()
    ).toBeVisible({ timeout: 30_000 });

    expect(
      errors,
      `sidebarCollapsed=${collapsed} produced a hydration mismatch`
    ).toEqual([]);
  });
}

test("documents hydrates cleanly with a restored search term", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("documents-search", "lease");
  });

  const errors = collectHydrationErrors(page);

  await page.goto("/documents");
  await expect(
    page.locator("main").getByRole("heading", { name: /Document/i }).first()
  ).toBeVisible({ timeout: 30_000 });

  expect(errors, "a restored search term produced a hydration mismatch").toEqual([]);
});

test("the sidebar honours the stored collapse preference", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("sidebarCollapsed", "true");
  });

  await page.goto("/dashboard");
  await expect(
    page.locator("main").getByRole("heading", { name: "Dashboard" }).first()
  ).toBeVisible({ timeout: 30_000 });

  // Collapsed swaps the toggle's label, so this also proves the preference
  // survived — a regression here would mean the setting silently stopped working.
  await expect(page.getByRole("button", { name: /expand sidebar/i })).toBeVisible({
    timeout: 15_000,
  });
});
