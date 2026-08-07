import { test, expect } from "@playwright/test";

/**
 * The same fact must read the same everywhere.
 *
 * This is the regression net for a bug class that recurred four times. Lease
 * status, unit status and property status were each stored in a column that was
 * written once and never recomputed, so views drifted apart: the property page
 * claimed "2 active leases · 100% Occupancy · Current Tenant" for leases that
 * had ended eight months earlier, while the dashboard correctly showed zero.
 *
 * Each fix looked complete and the next view was still wrong. These tests
 * compare views against each other rather than against a fixed expectation, so
 * they hold whatever the underlying data happens to be.
 */

/** Reads "N active leases of M units" off the dashboard occupancy card. */
async function readDashboardOccupancy(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  const subtitle = page.getByText(/\d+ active leases? of \d+ units?/);
  await expect(subtitle).toBeVisible({ timeout: 30_000 });
  const text = (await subtitle.textContent()) ?? "";
  const [, active, units] = text.match(/(\d+) active leases? of (\d+) units?/) ?? [];
  return { active: Number(active), units: Number(units) };
}

test("occupancy agrees between the dashboard and the property pages", async ({ page }) => {
  const dashboard = await readDashboardOccupancy(page);

  await page.goto("/properties");
  const statusBadge = page
    .getByText(/^(Occupied|Available|Maintenance|Under Contract)$/)
    .locator("visible=true")
    .first();
  await expect(statusBadge).toBeVisible({ timeout: 30_000 });
  const listStatus = ((await statusBadge.textContent()) ?? "").trim();

  // A property may be held in a manual state; those are exempt by design.
  test.skip(
    listStatus === "Maintenance" || listStatus === "Under Contract",
    "property is in a manual state, which is preserved rather than derived"
  );

  // With no active leases anywhere, no property may claim to be occupied.
  if (dashboard.active === 0) {
    expect(listStatus, "dashboard says 0 active leases but the list says Occupied")
      .not.toBe("Occupied");
  }

  await page.getByTestId("property-name-link").locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/properties\/[a-z0-9]+/i, { timeout: 30_000 });

  const detailBadge = page
    .getByText(/^(Occupied|Available|Maintenance|Under Contract)$/)
    .locator("visible=true")
    .first();
  await expect(detailBadge).toBeVisible({ timeout: 30_000 });
  const detailStatus = ((await detailBadge.textContent()) ?? "").trim();

  expect(detailStatus, "properties list and property detail disagree about occupancy")
    .toBe(listStatus);

  if (dashboard.active === 0) {
    // The detail page previously rendered expired leases as "Current Tenant".
    await expect(
      page.getByText("Current Tenant"),
      "property detail shows a current tenant while no lease is active"
    ).toHaveCount(0);
  }
});

test("the leases page agrees with the dashboard about active leases", async ({ page }) => {
  const dashboard = await readDashboardOccupancy(page);

  await page.goto("/leases");
  await expect(page.getByRole("heading", { name: "Leases" })).toBeVisible({ timeout: 30_000 });

  if (dashboard.active === 0) {
    // Expired leases are collapsed behind a history toggle rather than listed
    // as if they were live.
    await expect(
      page.getByText(/hidden|past leases|lease history/i).first(),
      "no active leases, but the leases page does not say so"
    ).toBeVisible({ timeout: 30_000 });
  }
});

test("a loading list never claims the account is empty", async ({ page }) => {
  // Both list pages passed their mutation-loading flag to the table while the
  // query result was still undefined, so the table saw an empty array and
  // rendered its empty state. An owner with nine properties was told they had
  // none until the query resolved.
  //
  // Asserted from the first paint rather than after settling, which is the only
  // moment the bug was visible.
  // Scoped to /properties, where the bug was reproduced. The leases page had
  // the identical defect and the identical fix, but its table is split into
  // titled sections whose empty copy varies, and a selector that brittle would
  // report on itself rather than on the app.
  await page.goto("/properties");

  const empty = page.getByText(/No properties found/i);
  const rows = page.locator("tbody tr");
  await expect(empty.or(rows.first())).toBeVisible({ timeout: 30_000 });

  if (await empty.isVisible()) {
    // If it says empty it must still say so once everything has settled. A
    // transient empty state means it was rendered over data still loading.
    await page.waitForLoadState("networkidle");
    await expect(
      empty,
      "the properties list showed its empty state while data was still loading"
    ).toBeVisible();
  }
});

test("the utility dashboard does not contradict the bills page", async ({ page }) => {
  await page.goto("/utility-bills");
  await expect(page.getByRole("heading", { name: /Utility Bill/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  const totalBills = page.getByTestId("total-amount");
  await expect(totalBills).toBeVisible({ timeout: 30_000 });
  const billsText = (await totalBills.textContent()) ?? "";
  const hasBills = /[1-9]/.test(billsText);

  await page.goto("/dashboard");
  if (hasBills) {
    // The dashboard once offered "Add Your First Bill" to an account holding 33
    // bills, because its chart window excluded every one of them.
    await expect(
      page.getByText("No Utility Bills Yet"),
      "dashboard claims the account has no bills while the bills page lists some"
    ).toHaveCount(0);
  }
});

test("bill due dates render as formatted days, not raw timestamps", async ({ page }) => {
  await page.goto("/utility-bills");
  await expect(page.getByRole("heading", { name: /Utility Bill/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  const body = (await page.locator("main").innerText()) ?? "";
  // Raw ISO instants leaked into the list because the value was printed verbatim.
  expect(body, "a raw ISO timestamp is being rendered").not.toMatch(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
  );
  // Amounts go through Intl, so thousands are separated.
  expect(body, "an amount is missing its thousands separator").not.toMatch(/\$\d{4,}\./);
});
