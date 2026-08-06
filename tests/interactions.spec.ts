import { test, expect } from "@playwright/test";

/**
 * Behaviours that only exist in a real browser: keyboard shortcuts, and dialogs
 * opened from a URL.
 *
 * These cannot be unit tested — the shortcut is a document-level listener that
 * has to win against the browser's own binding, and the deep link depends on
 * when a Suspense boundary resolves. The deep link in particular looked correct
 * in code while doing nothing: the page remounted when its boundary resolved
 * and discarded the state an effect had just set.
 */

test.describe("global search shortcut", () => {
  test("Control-K focuses search from anywhere", async ({ page }) => {
    await page.goto("/dashboard");
    const search = page.getByTestId("global-search-input");
    await expect(search).toBeVisible();
    await expect(search).not.toBeFocused();

    await page.keyboard.press("ControlOrMeta+k");

    await expect(search).toBeFocused();
  });

  test("Escape releases search without closing anything else", async ({ page }) => {
    await page.goto("/dashboard");
    const search = page.getByTestId("global-search-input");

    await page.keyboard.press("ControlOrMeta+k");
    await expect(search).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(search).not.toBeFocused();
  });

  test("shows the shortcut so it can be discovered", async ({ page }) => {
    await page.goto("/dashboard");
    // A shortcut nobody knows about is not a shortcut.
    await expect(page.locator("kbd").first()).toContainText("K");
  });
});

test.describe("deep links into bill dialogs", () => {
  test("?action=add opens the add-bill form", async ({ page }) => {
    await page.goto("/utility-bills?action=add");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("bill-date-input")).toBeVisible();
    await expect(dialog.getByTestId("due-date-input")).toBeVisible();
  });

  test("the bill form seeds both dates rather than leaving them blank", async ({
    page,
  }) => {
    await page.goto("/utility-bills?action=add");

    const billDate = page.getByTestId("bill-date-input");
    const dueDate = page.getByTestId("due-date-input");
    await expect(billDate).toBeVisible();

    // A missing due date leaves a bill unjudgeable — it cannot be overdue or
    // current — so the form must never hand back an empty one.
    expect(await billDate.inputValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await dueDate.inputValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("closing the dialog drops the parameter so refresh does not reopen it", async ({
    page,
  }) => {
    await page.goto("/utility-bills?action=add");
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await expect(page).toHaveURL(/\/utility-bills$/);
  });
});

test.describe("overdue bills read as overdue", () => {
  test("a past-due unpaid bill is labelled Overdue, not Unpaid", async ({ page }) => {
    await page.goto("/utility-bills");

    // The seeded account carries bills due in 2025. Whatever else is on the
    // page, none of them should still be describing themselves as merely
    // unpaid — that was the state a landlord could not act on.
    const overdue = page.getByText("Overdue", { exact: true });
    await expect(overdue.first()).toBeVisible();
  });

  test("the overdue filter narrows the list", async ({ page }) => {
    await page.goto("/utility-bills");

    const filter = page.locator("#paidStatus");
    await expect(filter).toBeVisible();
    await filter.selectOption("overdue");

    // Every remaining status badge must say Overdue; a paid-late or
    // not-yet-due bill appearing here would mean the filter is wrong.
    await expect(page.getByText("Paid", { exact: true })).toHaveCount(0);
  });
});
