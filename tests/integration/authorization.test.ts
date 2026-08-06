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
 * Every Convex function is a public HTTP endpoint. These tests call the real
 * deployment as two different real users and assert that neither can reach the
 * other's data.
 *
 * This is the regression net for the authorization migration: the app used to
 * accept `userId` as a client argument and trust it, so any caller could read
 * or modify anyone's data by passing a different Clerk id.
 */

const describeIfCreds = hasIntegrationCredentials() ? describe : describe.skip;

describeIfCreds("authorization", () => {
  let alice: ConvexHttpClient;
  let bob: ConvexHttpClient;
  let anon: ConvexHttpClient;
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    const users = await listUsers(20);
    // Two accounts that actually own data make the cross-tenant reads meaningful.
    const withData = users.filter((u) => u.email);
    expect(withData.length, "need at least two Clerk users to test isolation")
      .toBeGreaterThanOrEqual(2);

    aliceId = withData[0].id;
    bobId = withData[1].id;

    alice = new ConvexHttpClient(CONVEX_URL);
    alice.setAuth(await mintJwt(aliceId));
    bob = new ConvexHttpClient(CONVEX_URL);
    bob.setAuth(await mintJwt(bobId));
    anon = new ConvexHttpClient(CONVEX_URL);
  }, 60_000);

  afterAll(async () => {
    await revokeOpenedSessions();
  });

  /** Queries return either a bare array or a `{ <name>, total, hasMore }` wrapper. */
  const rows = (result: unknown): any[] =>
    Array.isArray(result)
      ? result
      : result && typeof result === "object"
        ? (Object.values(result).find(Array.isArray) as any[]) ?? []
        : [];

  /** A refused read is either an error or a deliberately empty result. */
  const refused = async (call: () => Promise<unknown>): Promise<boolean> => {
    try {
      const result = await call();
      return result === null || (Array.isArray(result) && result.length === 0);
    } catch (error) {
      return /NOT_FOUND|UNAUTHENTICATED|Unauthorized|permission|not found/i.test(
        String(error)
      );
    }
  };

  it("scopes list queries to the calling user", async () => {
    const aliceProps = await alice.query("properties:getProperties" as any, { limit: 100 });
    const bobProps = await bob.query("properties:getProperties" as any, { limit: 100 });

    expect(rows(aliceProps).every((p) => p.userId === aliceId)).toBe(true);
    expect(rows(bobProps).every((p) => p.userId === bobId)).toBe(true);

    const aliceIds = new Set(rows(aliceProps).map((p) => p._id));
    expect(rows(bobProps).some((p) => aliceIds.has(p._id))).toBe(false);
  }, 30_000);

  it("scopes leases, bills and documents to the calling user", async () => {
    const leases = rows(await alice.query("leases:getLeases" as any, {}));
    const bills = rows(await alice.query("utilityBills:getUtilityBills" as any, {}));
    const docs = rows(await alice.query("documents:getDocuments" as any, {}));

    expect(leases.every((l) => l.userId === aliceId)).toBe(true);
    expect(bills.every((b) => b.userId === aliceId)).toBe(true);
    expect(docs.every((d) => d.userId === aliceId)).toBe(true);
  }, 30_000);

  it("refuses cross-tenant reads by id", async () => {
    const bobProps = rows(await bob.query("properties:getProperties" as any, { limit: 100 }));
    const target = bobProps[0];
    if (!target) return; // nothing to probe

    expect(await refused(() => alice.query("properties:getProperty" as any, { id: target._id })))
      .toBe(true);
    expect(await refused(() =>
      alice.query("properties:getPropertyWithUnits" as any, { propertyId: target._id })
    )).toBe(true);
    expect(await refused(() =>
      alice.query("units:getUnitsByProperty" as any, { propertyId: target._id })
    )).toBe(true);
    expect(await refused(() =>
      alice.query("leases:getLeasesByProperty" as any, { propertyId: target._id })
    )).toBe(true);
    expect(await refused(() =>
      alice.query("propertyImages:getPropertyImages" as any, { propertyId: target._id })
    )).toBe(true);
    expect(await refused(() =>
      alice.query("listingPublications:getPropertyPublications" as any, { propertyId: target._id })
    )).toBe(true);
  }, 60_000);

  it("refuses cross-tenant writes", async () => {
    const bobProps = rows(await bob.query("properties:getProperties" as any, { limit: 100 }));
    const target = bobProps[0];
    if (!target) return;

    expect(await refused(() =>
      alice.mutation("properties:convertToMultiUnit" as any, { propertyId: target._id })
    )).toBe(true);
    expect(await refused(() =>
      alice.mutation("properties:deleteProperty" as any, { id: target._id })
    )).toBe(true);
  }, 30_000);

  it("refuses cross-tenant reads of billing data", async () => {
    // Probe in whichever direction actually has bills.
    const aliceBills = rows(await alice.query("utilityBills:getUtilityBills" as any, {}));
    const bobBills = rows(await bob.query("utilityBills:getUtilityBills" as any, {}));
    const [intruder, bills] = aliceBills.length ? [bob, aliceBills] : [alice, bobBills];
    const bill = bills[0];
    if (!bill) return;

    expect(await refused(() =>
      intruder.query("utilityBills:getUtilityBill" as any, { billId: bill._id })
    )).toBe(true);
    expect(await refused(() =>
      intruder.query("utilityCharges:getChargesForBill" as any, { billId: bill._id })
    )).toBe(true);
    expect(await refused(() =>
      intruder.mutation("utilityBills:deleteUtilityBill" as any, { id: bill._id })
    )).toBe(true);
  }, 60_000);

  it("rejects a spoofed userId argument outright", async () => {
    // The validator no longer declares userId, so passing one is a hard error
    // rather than something a handler might read.
    await expect(
      alice.query("properties:getProperties" as any, { userId: bobId, limit: 10 })
    ).rejects.toThrow(/userId/i);
  }, 30_000);

  it("denies anonymous callers", async () => {
    for (const fn of [
      "properties:getProperties",
      "leases:getLeases",
      "utilityBills:getUtilityBills",
      "documents:getDocuments",
    ]) {
      expect(await refused(() => anon.query(fn as any, {})), `${fn} allowed anonymous`).toBe(true);
    }
    expect(await refused(() => anon.mutation("storage:generateUploadUrl" as any, {}))).toBe(true);
  }, 30_000);

  it("keeps internal and removed endpoints off the public API", async () => {
    // getPlatformTokens returned OAuth access and refresh tokens; the migration
    // endpoints and the temporary auth probe should be unreachable too.
    for (const fn of [
      "listingJobs:getPlatformTokens",
      "platformTokens:getPlatformStats",
      "migrate:validateMigration",
      "authProbe:whoami",
    ]) {
      let gone = false;
      try {
        await alice.query(fn as any, {});
      } catch (error) {
        gone = /Could not find public function|does not exist/i.test(String(error));
      }
      expect(gone, `${fn} is still publicly callable`).toBe(true);
    }
  }, 30_000);
});
