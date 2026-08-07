import { describe, expect, it } from "vitest";
import { annualSummary, monthsOfYear } from "./annualSummary";

/**
 * A landlord's real deadline is tax time, and the question then is what a
 * property took in and paid out over a calendar year — not what it does this
 * month.
 *
 * Rent is counted month by month against the leases that were actually running,
 * because a property let for four months of the year did not earn twelve
 * months of rent. Utilities are counted from the bills that exist rather than
 * an average, since the point of an annual figure is that it is actual.
 */

const lease = (startDate: string, endDate: string, rent: number) => ({
  startDate,
  endDate,
  rent,
});

describe("monthsOfYear", () => {
  it("lists twelve YYYY-MM keys, zero padded", () => {
    const months = monthsOfYear(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01");
    expect(months[8]).toBe("2026-09");
    expect(months[11]).toBe("2026-12");
  });
});

describe("annualSummary", () => {
  it("counts rent only for the months a lease was running", () => {
    // Let from 1 April to 31 July: four months, not twelve.
    const result = annualSummary({
      year: 2026,
      leases: [lease("2026-04-01", "2026-07-31", 2_000)],
      bills: [],
      monthlyMortgage: 0,
      monthlyCapEx: 0,
    });
    expect(result.rent).toBe(8_000);
    expect(result.monthsOccupied).toBe(4);
  });

  it("counts a lease that spans the whole year in full", () => {
    const result = annualSummary({
      year: 2026,
      leases: [lease("2025-06-01", "2027-06-01", 1_500)],
      bills: [],
      monthlyMortgage: 0,
      monthlyCapEx: 0,
    });
    expect(result.rent).toBe(18_000);
    expect(result.monthsOccupied).toBe(12);
  });

  it("ignores leases that never overlap the year", () => {
    const result = annualSummary({
      year: 2026,
      leases: [lease("2024-01-01", "2024-12-31", 9_999)],
      bills: [],
      monthlyMortgage: 0,
      monthlyCapEx: 0,
    });
    expect(result.rent).toBe(0);
    expect(result.monthsOccupied).toBe(0);
  });

  it("adds concurrent leases in the same month, as a duplex does", () => {
    const result = annualSummary({
      year: 2026,
      leases: [
        lease("2026-01-01", "2026-12-31", 1_000),
        lease("2026-01-01", "2026-12-31", 800),
      ],
      bills: [],
      monthlyMortgage: 0,
      monthlyCapEx: 0,
    });
    expect(result.rent).toBe(21_600);
    // Two leases in one month is still one month of occupancy.
    expect(result.monthsOccupied).toBe(12);
  });

  it("sums the bills actually issued that year, not an average", () => {
    const result = annualSummary({
      year: 2026,
      leases: [],
      bills: [
        { billMonth: "2026-01", totalAmount: 120 },
        { billMonth: "2026-02", totalAmount: 95.5 },
        { billMonth: "2025-12", totalAmount: 500 },
      ],
      monthlyMortgage: 0,
      monthlyCapEx: 0,
    });
    expect(result.utilities).toBe(215.5);
  });

  it("annualises mortgage and capex, and nets everything off", () => {
    const result = annualSummary({
      year: 2026,
      leases: [lease("2026-01-01", "2026-12-31", 3_000)],
      bills: [{ billMonth: "2026-05", totalAmount: 600 }],
      monthlyMortgage: 1_000,
      monthlyCapEx: 100,
    });
    expect(result.rent).toBe(36_000);
    expect(result.utilities).toBe(600);
    expect(result.mortgage).toBe(12_000);
    expect(result.capEx).toBe(1_200);
    expect(result.net).toBe(36_000 - 600 - 12_000 - 1_200);
  });

  it("reports a vacant year as a loss rather than as nothing", () => {
    const result = annualSummary({
      year: 2026,
      leases: [],
      bills: [],
      monthlyMortgage: 900,
      monthlyCapEx: 90,
    });
    expect(result.net).toBe(-11_880);
    expect(result.monthsOccupied).toBe(0);
  });
});
