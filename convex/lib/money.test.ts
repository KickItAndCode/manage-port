import { describe, expect, it } from "vitest";
import { allocateCents, toCents } from "./money";

const pct = (...percentages: number[]) =>
  percentages.map((percentage, i) => ({ item: `t${i}`, percentage }));

/** The invariant that matters: the parts add back up to the whole. */
const sums = (total: number, shares: Array<{ item: string; percentage: number }>) => {
  const { allocations, ownerCents } = allocateCents(total, shares);
  const allocated = allocations.reduce((s, a) => s + a.cents, 0);
  return allocated + ownerCents === toCents(total);
};

describe("allocateCents", () => {
  it("splits an even bill exactly", () => {
    const { allocations, ownerAmount } = allocateCents(100, pct(50, 50));
    expect(allocations.map((a) => a.amount)).toEqual([50, 50]);
    expect(ownerAmount).toBe(0);
  });

  it("distributes the leftover penny on a three-way split", () => {
    // $100 / 3 is $33.333...; rounding each independently loses a cent.
    const { allocations, ownerAmount } = allocateCents(
      100,
      pct(33.333333, 33.333333, 33.333334),
    );
    const amounts = allocations.map((a) => a.amount);
    expect(amounts.reduce((s, a) => s + a, 0) + ownerAmount).toBeCloseTo(100, 10);
    // Every tenant is within a penny of their exact share.
    for (const a of amounts) expect(Math.abs(a - 33.3333)).toBeLessThan(0.01);
  });

  it("gives the owner the remainder when tenants cover only part", () => {
    const { allocations, ownerAmount } = allocateCents(200, pct(25, 25));
    expect(allocations.map((a) => a.amount)).toEqual([50, 50]);
    expect(ownerAmount).toBe(100);
  });

  it("assigns the whole bill to the owner when there are no tenant shares", () => {
    const { allocations, ownerAmount } = allocateCents(87.65, []);
    expect(allocations).toEqual([]);
    expect(ownerAmount).toBe(87.65);
  });

  it("handles a bill whose cents do not divide evenly", () => {
    const { allocations, ownerAmount } = allocateCents(0.01, pct(50, 50));
    // One tenant gets the single penny, the other gets nothing; nothing is lost.
    expect(allocations.reduce((s, a) => s + a.cents, 0) + toCents(ownerAmount)).toBe(1);
  });

  it("never loses or invents money across many shapes", () => {
    const totals = [0.01, 0.99, 1, 33.33, 99.99, 100, 1234.56, 5782.86];
    const splits = [
      pct(100), pct(50, 50), pct(33.33, 33.33, 33.34), pct(1, 99),
      pct(25, 25, 25, 25), pct(60, 40), pct(70), pct(10, 20, 30),
      pct(33.333333, 33.333333, 33.333334), pct(0.01, 99.99),
    ];
    for (const total of totals) {
      for (const split of splits) {
        expect(sums(total, split), `total=${total} split=${JSON.stringify(split.map(s => s.percentage))}`).toBe(true);
      }
    }
  });

  it("is stable for a given input order", () => {
    const a = allocateCents(100, pct(33.333333, 33.333333, 33.333334));
    const b = allocateCents(100, pct(33.333333, 33.333333, 33.333334));
    expect(a.allocations.map((x) => x.cents)).toEqual(b.allocations.map((x) => x.cents));
  });

  it("does not exceed the bill when percentages sum past 100", () => {
    // Over-allocation is rejected upstream, but the allocator must not invent money.
    const { allocations, ownerCents } = allocateCents(100, pct(60, 60));
    const allocated = allocations.reduce((s, x) => s + x.cents, 0);
    expect(allocated + ownerCents).toBe(toCents(100));
    expect(ownerCents).toBeLessThan(0); // surfaces as a negative owner share
  });
});
