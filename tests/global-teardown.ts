import { ConvexHttpClient } from "convex/browser";
import {
  CONVEX_URL,
  hasIntegrationCredentials,
  listUsers,
  mintJwt,
  revokeOpenedSessions,
} from "./support/testEnv";

/**
 * Removes records the browser tests created, and closes the Clerk sessions the
 * run opened.
 *
 * Cleanup happens here rather than at the end of each test because driving the
 * delete UI is the least reliable part of a spec — it depends on a menu, a
 * confirmation dialog, and the page still being open — and a failure there
 * would report as a test failure even though the behaviour under test passed.
 * Deleting through Convex is one call and cannot be raced by the browser
 * closing.
 *
 * Identifying test bills: the quick-add form has no free-text field to mark, so
 * fixtures use a distinctive amount in a far-future month that real data will
 * not occupy.
 */

const FIXTURE_AMOUNT = 133.33;
const FIXTURE_MONTHS = ["2026-08", "2099-01", "2099-02", "2099-03"];

export default async function globalTeardown() {
  if (!hasIntegrationCredentials()) return;

  try {
    const users = await listUsers(30);
    for (const user of users) {
      const client = new ConvexHttpClient(CONVEX_URL);
      client.setAuth(await mintJwt(user.id));

      const result: any = await client.query("utilityBills:getUtilityBills" as any, {});
      const bills = Array.isArray(result) ? result : (result?.bills ?? []);

      for (const bill of bills) {
        const isFixture =
          FIXTURE_MONTHS.includes(bill.billMonth) &&
          Math.abs(bill.totalAmount - FIXTURE_AMOUNT) < 0.005;
        if (isFixture) {
          await client
            .mutation("utilityBills:deleteUtilityBill" as any, { id: bill._id })
            .catch(() => undefined);
        }
      }
    }
  } catch {
    // Teardown must never fail the run; a leftover fixture is visible in the
    // data browser by its distinctive amount.
  } finally {
    await revokeOpenedSessions();
  }
}
