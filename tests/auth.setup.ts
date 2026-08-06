import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { listUsers, mintSignInTicket, hasIntegrationCredentials } from "./support/testEnv";

const authFile = "playwright/.auth/user.json";

/**
 * Authenticates once and saves the storage state for every other project.
 *
 * This used to drive Clerk's sign-in form: fill the email, click continue, wait
 * for the password field, fill it, submit. That coupled the whole suite to
 * Clerk's markup, needed a password in the environment, and was the slowest and
 * flakiest step in the run.
 *
 * Instead we mint a single-use sign-in ticket through Clerk's Backend API and
 * hand it to the app as a query parameter. Clerk exchanges it for a session on
 * load. No password, no form, one HTTP call.
 *
 * The ticket must be a query parameter, not a fragment — a fragment never
 * reaches Clerk and the exchange silently does nothing.
 */
setup("authenticate", async ({ page }) => {
  expect(
    hasIntegrationCredentials(),
    "CLERK_SECRET_KEY and NEXT_PUBLIC_CONVEX_URL are required to authenticate"
  ).toBe(true);

  const preferred = process.env.TEST_USER_EMAIL;
  const users = await listUsers(30);
  const user =
    users.find((u) => preferred && u.email === preferred) ??
    users.find((u) => u.email);

  expect(user, "no Clerk user available to sign in as").toBeTruthy();

  const ticket = await mintSignInTicket(user!.id);
  await page.goto(`/sign-in?__clerk_ticket=${ticket}`);

  // Clerk redirects to the app once the ticket is exchanged.
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 30_000,
  });

  // Confirm the session really took rather than trusting the redirect.
  // "Dashboard" also names a sidebar link, so scope to the page heading.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.locator("main").getByRole("heading", { name: "Dashboard" }).first()
  ).toBeVisible({ timeout: 30_000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
