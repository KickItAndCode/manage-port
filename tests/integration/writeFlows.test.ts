import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import {
  CONVEX_URL,
  hasIntegrationCredentials,
  listUsers,
  mintJwt,
  revokeOpenedSessions,
} from "../support/testEnv";

/**
 * Exercises the mutations behind the create/edit forms, and the two derivations
 * that kept drifting: lease status and occupancy.
 *
 * Everything created here is deleted in afterAll. Records are named so that
 * anything left behind by a crashed run is obvious in the data browser.
 */

const describeIfCreds = hasIntegrationCredentials() ? describe : describe.skip;
const MARKER = "ZZ-AUTOTEST";

describeIfCreds("write flows", () => {
  let client: ConvexHttpClient;
  let propertyId: string;
  const createdBills: string[] = [];
  const createdLeases: string[] = [];

  beforeAll(async () => {
    const users = await listUsers(20);
    // Use whichever account owns a property, so the flows have something to hang off.
    for (const user of users) {
      const c = new ConvexHttpClient(CONVEX_URL);
      c.setAuth(await mintJwt(user.id));
      const result: any = await c.query("properties:getProperties" as any, { limit: 5 });
      if (result?.properties?.length) {
        client = c;
        propertyId = result.properties[0]._id;
        await sweepLeftovers();
        return;
      }
    }
    throw new Error("no Clerk user owns a property; cannot exercise write flows");
  }, 90_000);

  /**
   * Removes records a previous crashed run left behind.
   *
   * Without this one failure poisons every later run: the app permits a single
   * active lease per property, so an orphaned test lease blocks the next
   * attempt to create one, and the suite fails for a reason that has nothing to
   * do with the code under test.
   */
  async function sweepLeftovers() {
    const leases: any = await client.query("leases:getLeases" as any, {});
    for (const lease of Array.isArray(leases) ? leases : (leases?.leases ?? [])) {
      if (typeof lease.tenantName === "string" && lease.tenantName.includes(MARKER)) {
        await client.mutation("leases:deleteLease" as any, { id: lease._id }).catch(() => undefined);
      }
    }
    const bills: any = await client.query("utilityBills:getUtilityBills" as any, {});
    for (const bill of Array.isArray(bills) ? bills : (bills?.bills ?? [])) {
      if (bill.provider === MARKER) {
        await client
          .mutation("utilityBills:deleteUtilityBill" as any, { id: bill._id })
          .catch(() => undefined);
      }
    }
  }

  afterAll(async () => {
    for (const id of createdLeases) {
      await client.mutation("leases:deleteLease" as any, { id }).catch(() => undefined);
    }
    for (const id of createdBills) {
      await client.mutation("utilityBills:deleteUtilityBill" as any, { id }).catch(() => undefined);
    }
    await revokeOpenedSessions();
  }, 60_000);

  const addBill = async (overrides: Record<string, unknown> = {}) => {
    const id = await client.mutation("utilityBills:addUtilityBill" as any, {
      propertyId,
      utilityType: "Electric",
      provider: MARKER,
      billMonth: "2099-01",
      totalAmount: 100,
      billDate: "2099-01-01",
      dueDate: "2099-02-15",
      ...overrides,
    });
    createdBills.push(id as string);
    return id as string;
  };

  it("creates and reads back a utility bill", async () => {
    const id = await addBill();
    const bill: any = await client.query("utilityBills:getUtilityBill" as any, { billId: id });
    expect(bill?.totalAmount).toBe(100);
    expect(bill?.provider).toBe(MARKER);
  }, 60_000);

  it("updates a utility bill", async () => {
    const id = await addBill({ billMonth: "2099-02", dueDate: "2099-03-15" });
    await client.mutation("utilityBills:updateUtilityBill" as any, { id, totalAmount: 250 });
    const bill: any = await client.query("utilityBills:getUtilityBill" as any, { billId: id });
    expect(bill?.totalAmount).toBe(250);
  }, 60_000);

  it("splits a bill so the parts sum to the whole", async () => {
    // The preview and the persisted charges share one allocator, so whatever
    // the split is, tenant shares plus the owner's remainder must equal the bill.
    const preview: any = await client.query("utilityBills:getBillSplitPreview" as any, {
      propertyId,
      utilityType: "Electric",
      totalAmount: 100,
    });
    const tenantTotal = (preview.charges ?? []).reduce(
      (sum: number, c: any) => sum + c.chargedAmount,
      0
    );
    expect(tenantTotal + (preview.ownerPortion ?? 0)).toBeCloseTo(100, 2);
  }, 60_000);

  it("creates a lease that computes as active, and deletes it", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const later = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10);

    const before: any = await client.query("leases:getLeaseStats" as any, {});
    const beforeActive = before.activeLeases ?? before.active ?? 0;

    const leaseId = await client.mutation("leases:addLease" as any, {
      propertyId,
      tenantName: `${MARKER} tenant`,
      startDate: today,
      endDate: later,
      rent: 1000,
    });
    createdLeases.push(leaseId as string);

    const after: any = await client.query("leases:getLeaseStats" as any, {});
    expect(after.activeLeases ?? after.active).toBe(beforeActive + 1);

    // Release it here rather than in afterAll: the app allows only one active
    // lease per property, so leaving it would block the next test from adding
    // one. afterAll still sweeps it if this line is never reached.
    await client.mutation("leases:deleteLease" as any, { id: leaseId });
    createdLeases.splice(createdLeases.indexOf(leaseId as string), 1);
  }, 60_000);

  it("derives property occupancy from live leases in both directions", async () => {
    // The stored properties.status column drifted: it reported "Occupied" for a
    // property whose every lease had ended. Occupancy must follow the leases.
    //
    // "Maintenance" and "Under Contract" are deliberately exempt — they record
    // a decision someone made about the property, not a consequence of a lease,
    // so they are preserved rather than derived. Assert whichever contract
    // applies to the property this run picked.
    const before: any = await client.query("properties:getProperty" as any, { id: propertyId });
    const isManualState =
      before?.status === "Maintenance" || before?.status === "Under Contract";

    const today = new Date().toISOString().slice(0, 10);
    const later = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10);

    const leaseId = await client.mutation("leases:addLease" as any, {
      propertyId,
      tenantName: `${MARKER} occupancy`,
      startDate: today,
      endDate: later,
      rent: 500,
    });
    createdLeases.push(leaseId as string);

    const withLease: any = await client.query("properties:getProperty" as any, { id: propertyId });
    expect(withLease?.status).toBe(isManualState ? before.status : "Occupied");

    await client.mutation("leases:deleteLease" as any, { id: leaseId });
    createdLeases.splice(createdLeases.indexOf(leaseId as string), 1);

    const withoutLease: any = await client.query("properties:getProperty" as any, {
      id: propertyId,
    });
    expect(withoutLease?.status).toBe(isManualState ? before.status : "Available");
  }, 90_000);

  it("does not charge tenants whose leases have ended", async () => {
    // Charge generation keys off leases active today. An expired lease must not
    // keep producing charges, which is what the stored-status bug caused.
    const id = await addBill({ billMonth: "2099-03", dueDate: "2099-04-15" });
    const charges: any = await client.query("utilityCharges:getChargesForBill" as any, {
      billId: id,
    });
    const leases: any = await client.query("leases:getLeases" as any, {});
    const activeCount =
      (Array.isArray(leases) ? leases : leases?.leases ?? []).filter((l: any) => {
        const now = new Date().toISOString().slice(0, 10);
        return l.startDate.slice(0, 10) <= now && l.endDate.slice(0, 10) >= now;
      }).length;

    // A charge per active lease that has a responsibility set, never more.
    expect(charges.length).toBeLessThanOrEqual(activeCount);
  }, 60_000);
});
