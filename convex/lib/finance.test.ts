import { describe, expect, it } from "vitest";
import {
  averageMonthlyCost,
  monthlyNetIncome,
  monthlyNetOperatingIncome,
} from "./finance";

/**
 * These exist because the same phrase meant two different things.
 *
 * The dashboard computed net income as rent − utilities − mortgage − capex.
 * The property page computed rent − mortgage − capex, with a comment saying
 * utilities were tracked elsewhere. On an account with 33 utility bills the
 * portfolio total therefore disagreed with the sum of its properties, and
 * neither screen said which one to believe.
 */

describe("monthlyNetIncome", () => {
  it("subtracts every cost the owner carries, utilities included", () => {
    expect(
      monthlyNetIncome({
        monthlyRent: 4_000,
        monthlyUtilities: 300,
        monthlyMortgage: 2_200,
        monthlyCapEx: 220,
      })
    ).toBe(1_280);
  });

  it("goes negative rather than clamping at zero", () => {
    // A vacant property still owes its mortgage. Hiding that would be the
    // same overstatement this app has corrected before.
    expect(
      monthlyNetIncome({
        monthlyRent: 0,
        monthlyUtilities: 100,
        monthlyMortgage: 5_850,
        monthlyCapEx: 585,
      })
    ).toBe(-6_535);
  });

  it("treats absent costs as zero, not as missing", () => {
    expect(
      monthlyNetIncome({ monthlyRent: 1_500, monthlyUtilities: 0, monthlyMortgage: 0, monthlyCapEx: 0 })
    ).toBe(1_500);
  });
});

describe("monthlyNetOperatingIncome", () => {
  it("excludes the mortgage, because financing is not the property", () => {
    // Two owners of identical buildings with different loans must see the
    // same operating income; that is what makes cap rates comparable.
    const inputs = {
      monthlyRent: 4_000,
      monthlyUtilities: 300,
      monthlyMortgage: 2_200,
      monthlyCapEx: 220,
    };
    expect(monthlyNetOperatingIncome(inputs)).toBe(3_480);
  });

  it("still counts capex, which is an operating reserve", () => {
    expect(
      monthlyNetOperatingIncome({
        monthlyRent: 1_000,
        monthlyUtilities: 0,
        monthlyMortgage: 999_999,
        monthlyCapEx: 100,
      })
    ).toBe(900);
  });
});

describe("averageMonthlyCost", () => {
  it("spreads the total across the window, not across the bill count", () => {
    // Four bills in three months is a monthly average of the total over
    // three, not over four. Dividing by the count would report the average
    // bill and call it the monthly cost.
    const bills = [{ totalAmount: 100 }, { totalAmount: 200 }, { totalAmount: 300 }, { totalAmount: 600 }];
    expect(averageMonthlyCost(bills, 3)).toBe(400);
  });

  it("is zero when there are no bills", () => {
    expect(averageMonthlyCost([], 3)).toBe(0);
  });

  it("never divides by zero months", () => {
    expect(averageMonthlyCost([{ totalAmount: 90 }], 0)).toBe(0);
  });

  it("handles a fractional window, as a week-long range produces", () => {
    expect(averageMonthlyCost([{ totalAmount: 70 }], 7 / 30)).toBeCloseTo(300, 5);
  });
});
