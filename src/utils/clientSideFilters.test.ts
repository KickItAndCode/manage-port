import { describe, expect, it } from "vitest";
import type { Doc } from "@/../convex/_generated/dataModel";
import { filterBills } from "./clientSideFilters";

/**
 * The overdue filter is the one a landlord reaches for to answer "what am I
 * late on". It is a narrower slice of unpaid rather than a sibling of it, so
 * the cases that matter are the ones where the two could disagree: a bill paid
 * long after its due date must not appear, and an unpaid bill that is merely
 * upcoming must not either.
 */

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function bill(overrides: Partial<Doc<"utilityBills">>): Doc<"utilityBills"> {
  return {
    _id: Math.random().toString(36).slice(2) as Doc<"utilityBills">["_id"],
    utilityType: "Electric",
    provider: "Acme Power",
    billMonth: "2026-01",
    totalAmount: 100,
    dueDate: dayOffset(30),
    landlordPaidUtilityCompany: false,
    ...overrides,
  } as Doc<"utilityBills">;
}

const lateAndUnpaid = bill({ dueDate: dayOffset(-30), landlordPaidUtilityCompany: false });
const lateButPaid = bill({ dueDate: dayOffset(-30), landlordPaidUtilityCompany: true });
const dueTomorrow = bill({ dueDate: dayOffset(1), landlordPaidUtilityCompany: false });
const dueNextMonth = bill({ dueDate: dayOffset(30), landlordPaidUtilityCompany: false });

const all = [lateAndUnpaid, lateButPaid, dueTomorrow, dueNextMonth];

describe("filterBills — paidStatus", () => {
  it("returns only past-due unpaid bills for 'overdue'", () => {
    const result = filterBills(all, { paidStatus: "overdue" });
    expect(result).toEqual([lateAndUnpaid]);
  });

  it("excludes a bill that was paid late", () => {
    // Settled is settled. Being late to pay does not leave it outstanding.
    const result = filterBills(all, { paidStatus: "overdue" });
    expect(result).not.toContain(lateButPaid);
  });

  it("excludes unpaid bills that are not yet due", () => {
    const result = filterBills(all, { paidStatus: "overdue" });
    expect(result).not.toContain(dueTomorrow);
    expect(result).not.toContain(dueNextMonth);
  });

  it("still returns every unpaid bill for 'unpaid', overdue or not", () => {
    const result = filterBills(all, { paidStatus: "unpaid" });
    expect(result).toHaveLength(3);
    expect(result).toContain(lateAndUnpaid);
    expect(result).toContain(dueTomorrow);
  });

  it("leaves the list untouched for 'all'", () => {
    expect(filterBills(all, { paidStatus: "all" })).toHaveLength(4);
    expect(filterBills(all, {})).toHaveLength(4);
  });

  it("composes with other filters rather than replacing them", () => {
    const gas = bill({
      dueDate: dayOffset(-5),
      utilityType: "Gas",
      landlordPaidUtilityCompany: false,
    });
    const result = filterBills([...all, gas], {
      paidStatus: "overdue",
      utilityTypes: ["Gas"],
    });
    expect(result).toEqual([gas]);
  });
});
