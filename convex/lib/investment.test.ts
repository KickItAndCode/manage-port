import { describe, expect, it } from "vitest";
import {
  appreciation,
  capRate,
  cashOnCash,
  portfolioValue,
  valueOf,
} from "./investment";

/**
 * Every function here returns null rather than 0 when it lacks the inputs.
 *
 * A missing purchase price is not a property worth nothing, and a property with
 * no value on file has no cap rate — it does not have a cap rate of zero. This
 * app has already shipped the opposite mistake once, telling a landlord they
 * had no bills when the timeframe was empty rather than the account.
 */

describe("valueOf", () => {
  it("prefers what the property is worth now", () => {
    expect(valueOf({ purchasePrice: 300_000, currentValue: 420_000 })).toBe(420_000);
  });

  it("falls back to what was paid when no current value is on file", () => {
    expect(valueOf({ purchasePrice: 300_000 })).toBe(300_000);
  });

  it("is null when neither is known", () => {
    expect(valueOf({})).toBeNull();
  });

  it("treats zero as a real figure, not a missing one", () => {
    // A property written down to nothing is a fact; it must not silently fall
    // back to the purchase price.
    expect(valueOf({ purchasePrice: 300_000, currentValue: 0 })).toBe(0);
  });
});

describe("appreciation", () => {
  it("reports gain in both dollars and percent", () => {
    const result = appreciation({ purchasePrice: 300_000, currentValue: 420_000 });
    expect(result).toEqual({ amount: 120_000, percent: 40 });
  });

  it("reports a loss as negative rather than hiding it", () => {
    const result = appreciation({ purchasePrice: 400_000, currentValue: 320_000 });
    expect(result).toEqual({ amount: -80_000, percent: -20 });
  });

  it("is null without both figures", () => {
    expect(appreciation({ purchasePrice: 300_000 })).toBeNull();
    expect(appreciation({ currentValue: 300_000 })).toBeNull();
    expect(appreciation({})).toBeNull();
  });

  it("is null when the purchase price is zero", () => {
    // Percent would divide by zero. An inherited or gifted property has no
    // meaningful percentage return on a price that was never paid.
    expect(appreciation({ purchasePrice: 0, currentValue: 250_000 })).toBeNull();
  });
});

describe("capRate", () => {
  it("is annual net operating income over value, as a percent", () => {
    // 24,000 NOI on a 400,000 property is a 6% cap rate.
    expect(capRate(24_000, 400_000)).toBe(6);
  });

  it("goes negative when the property loses money", () => {
    expect(capRate(-8_000, 400_000)).toBe(-2);
  });

  it("is null without a value to divide by", () => {
    expect(capRate(24_000, null)).toBeNull();
    expect(capRate(24_000, 0)).toBeNull();
  });
});

describe("cashOnCash", () => {
  it("is annual cash flow over cash actually invested", () => {
    // 6,000 a year on 80,000 down is 7.5%.
    expect(cashOnCash(6_000, 80_000)).toBe(7.5);
  });

  it("is null when cash invested is unknown", () => {
    // This is the honest answer. Substituting the purchase price would report
    // the return of an all-cash buyer to someone who used a mortgage.
    expect(cashOnCash(6_000, undefined)).toBeNull();
    expect(cashOnCash(6_000, 0)).toBeNull();
  });
});

describe("portfolioValue", () => {
  it("sums what is known and says how much is missing", () => {
    const result = portfolioValue([
      { currentValue: 420_000 },
      { purchasePrice: 300_000 },
      {},
    ]);
    expect(result).toEqual({ total: 720_000, valued: 2, unvalued: 1 });
  });

  it("reports an empty portfolio as zero valued properties, not zero value", () => {
    expect(portfolioValue([])).toEqual({ total: 0, valued: 0, unvalued: 0 });
  });

  it("counts properties with no figures so the total is never mistaken for complete", () => {
    const result = portfolioValue([{}, {}]);
    expect(result.valued).toBe(0);
    expect(result.unvalued).toBe(2);
  });
});
