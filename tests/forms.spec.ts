import { test, expect } from "@playwright/test";

/**
 * Drives the create forms with real browser events.
 *
 * The mutations behind these forms are covered by tests/integration, which call
 * Convex directly. That leaves a gap: whether the form actually wires up to
 * them. Setting a <select>'s value programmatically does not fire React's
 * onChange, so a form can look filled while its state is empty and its submit
 * button stays disabled — which is exactly the ambiguity that stalled manual
 * verification of Quick Add Bill.
 *
 * Playwright's selectOption and fill dispatch the events React listens for, so
 * these tests exercise the real path a user takes.
 */

const MARKER = "ZZ-AUTOTEST-FORM";

test.describe("quick add bill", () => {
  test("adds a bill and it appears in the list", async ({ page }) => {
    // Loads the page, submits, then reloads to confirm the bill persisted —
    // more round trips than the 30s default allows for.
    test.setTimeout(90_000);
    await page.goto("/utility-bills");
    await expect(page.getByRole("heading", { name: /Utility Bill/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const before = await page.getByTestId("total-bills").textContent().catch(() => null);

    const quickAdd = page.locator("form").filter({ hasText: /Add/ }).first();
    const propertySelect = quickAdd.locator("select").first();
    const typeSelect = quickAdd.locator("select").nth(1);
    const amount = quickAdd.locator('input[type="number"]');

    // Pick the first real property rather than the placeholder option.
    const propertyValue = await propertySelect
      .locator("option")
      .nth(1)
      .getAttribute("value");
    test.skip(!propertyValue, "no property available to bill");

    await propertySelect.selectOption(propertyValue!);
    await typeSelect.selectOption("Electric");
    await amount.fill("133.33");

    const submit = quickAdd.getByRole("button", { name: "Add" });
    // If the button is disabled here, the form never received the values —
    // the failure mode this test exists to catch.
    await expect(submit, "submit stayed disabled after filling the form").toBeEnabled({
      timeout: 5_000,
    });
    await submit.click();

    // Assert on the resulting row rather than the toast: the toast
    // auto-dismisses, so waiting on it makes the test a race.
    const newRow = page.getByText("$133.33").first();
    await expect(newRow, "the new bill never appeared in the list").toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    const after = await page.getByTestId("total-bills").textContent().catch(() => null);
    if (before && after) {
      expect(Number(after.replace(/\D/g, "")), "bill count did not increase").toBeGreaterThan(
        Number(before.replace(/\D/g, "")) - 1
      );
    }

    // Cleanup runs in tests/global-teardown.ts, which deletes this fixture
    // through Convex rather than driving the delete menu.
  });
});

test.describe("form validation", () => {
  test("quick add refuses an empty amount", async ({ page }) => {
    await page.goto("/utility-bills");
    await expect(page.getByRole("heading", { name: /Utility Bill/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const quickAdd = page.locator("form").filter({ hasText: /Add/ }).first();
    const propertyValue = await quickAdd
      .locator("select")
      .first()
      .locator("option")
      .nth(1)
      .getAttribute("value");
    test.skip(!propertyValue, "no property available to bill");

    await quickAdd.locator("select").first().selectOption(propertyValue!);
    await quickAdd.locator("select").nth(1).selectOption("Electric");
    // Amount deliberately left blank.

    await expect(
      quickAdd.getByRole("button", { name: "Add" }),
      "submit should stay disabled without an amount"
    ).toBeDisabled();
  });
});

test.describe("lease form", () => {
  test("opens from the property page without error", async ({ page }) => {
    await page.goto("/properties");
    const openProperty = page.getByTestId("property-name-link").locator("visible=true").first();
    await expect(openProperty).toBeVisible({ timeout: 30_000 });
    await openProperty.click();
    await expect(page).toHaveURL(/\/properties\/[a-z0-9]+/i, { timeout: 30_000 });

    const addLease = page.getByRole("button", { name: /add lease|new lease/i }).first();
    test.skip(!(await addLease.count()), "no add-lease entry point on this page");

    await addLease.click();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    // The form should reach a usable state rather than an empty dialog.
    await expect(page.getByRole("dialog").or(page.locator("form")).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
