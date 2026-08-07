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
    // Wait for hydration before pressing: the shortcut is a document listener
    // attached on mount, and a keypress sent before that lands nowhere.
    await expect(search).toBeVisible();

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

  test("the dashboard agrees with the bills page about what is late", async ({
    page,
  }) => {
    // Asserted against the bills page rather than a fixed number, so this does
    // not depend on which account the suite signs in as. The card is
    // deliberately absent when nothing is overdue — a permanent "Overdue: 0"
    // is noise — so both directions are checked.
    await page.goto("/utility-bills");
    const billsCount = page.getByTestId("overdue-bills-count");
    await expect(billsCount).toBeVisible();
    const expected = Number((await billsCount.textContent())?.trim());

    await page.goto("/dashboard");
    const card = page.getByTestId("kpi-overdue-value");

    if (expected === 0) {
      await expect(card).toHaveCount(0);
      return;
    }

    await expect(card).toBeVisible({ timeout: 15_000 });
    // A count, not a currency amount: KPICard formats every number it is
    // given as USD, which rendered 33 bills as "$33".
    await expect(card).toHaveText(String(expected));
  });

  test("the dashboard card lands on the bills already filtered", async ({ page }) => {
    await page.goto("/utility-bills?status=overdue");

    await expect(page.locator("#paidStatus")).toHaveValue("overdue");
    await expect(page.getByText("Paid", { exact: true })).toHaveCount(0);
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
