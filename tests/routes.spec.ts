import { test, expect, type Page } from "@playwright/test";

/**
 * Every route must render for a signed-in user.
 *
 * This exists because three pages once shipped broken behind the error
 * boundary — /utility-bills and /documents threw an ArgumentValidationError on
 * a stale argument while typecheck, lint and the production build were all
 * green. Nothing in the suite loaded a page and looked at it.
 *
 * The assertions are deliberately shallow. The point is not to check content,
 * it is to prove the page mounts, reaches its data, and reports no error.
 */

const ROUTES = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/properties", heading: "Properties" },
  { path: "/leases", heading: "Leases" },
  { path: "/utility-bills", heading: /Utility Bill/i },
  { path: "/documents", heading: /Document/i },
  { path: "/settings", heading: "Settings" },
];

/** Console errors worth failing on — third-party noise is filtered out. */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Clerk development-mode banners and favicon noise are not app failures.
    if (/development keys|deprecated|favicon|Download the React DevTools/i.test(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

test.describe("routes render for a signed-in user", () => {
  for (const route of ROUTES) {
    test(`${route.path} mounts without error`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await page.goto(route.path);

      // The error boundary is the exact failure mode that shipped unnoticed.
      await expect(
        page.getByText("Something went wrong"),
        `${route.path} rendered the error boundary`
      ).toHaveCount(0);

      await expect(
        page.locator("main").getByRole("heading", { name: route.heading }).first(),
        `${route.path} never rendered its heading`
      ).toBeVisible({ timeout: 30_000 });

      expect(errors, `${route.path} logged console errors`).toEqual([]);
    });
  }

  test("a property detail page mounts without error", async ({ page }) => {
    const errors = collectPageErrors(page);

    // The list navigates via click handlers rather than anchors, so drive it
    // the way a user does: click the property card itself.
    await page.goto("/properties");
    await expect(
      page.locator("main").getByRole("heading", { name: "Properties" }).first()
    ).toBeVisible({ timeout: 30_000 });

    // count() resolves immediately, so checking it before the table has
    // rendered skipped the test on a slow load rather than running it.
    const openProperty = page.getByTestId("property-name-link").locator("visible=true").first();
    await expect(openProperty).toBeVisible({ timeout: 30_000 });
    await openProperty.click();

    await expect(page).toHaveURL(/\/properties\/[a-z0-9]+/i, { timeout: 30_000 });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(page.getByText("Back to Properties")).toBeVisible({ timeout: 30_000 });
    expect(errors, "property detail logged console errors").toEqual([]);
  });
});

test.describe("routes are protected", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of ROUTES) {
    test(`${route.path} redirects a signed-out visitor`, async ({ page }) => {
      await page.goto(route.path);
      // Middleware redirects at the edge. When it was misplaced outside src/ it
      // never ran, and signed-out visitors sat on an endless loading skeleton.
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 30_000 });
    });
  }
});
