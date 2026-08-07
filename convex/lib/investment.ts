/**
 * Investment metrics, derived from what a property cost and what it is worth.
 *
 * The app tracked the mortgage payment but never the purchase price or the
 * value, so it could compute cash flow and never return. An owner could see
 * money moving each month with no way to answer whether the property was
 * actually a good one.
 *
 * Every function returns null when it lacks an input rather than falling back
 * to zero. A property with no value on file does not have a cap rate of zero —
 * it has no cap rate, and saying so is the difference between a blank and a
 * lie. This codebase has already shipped that mistake once, reporting an empty
 * timeframe as an empty account.
 *
 * Shared by both runtimes, like leaseStatus and money, so the dashboard and the
 * property page cannot drift to different answers.
 */

export interface PropertyInvestment {
  /** What the owner paid. */
  purchasePrice?: number;
  /** What it is worth now, if they have kept it current. */
  currentValue?: number;
  /**
   * Cash actually put in — deposit plus closing costs and any rehab.
   *
   * Separate from purchase price because they are only the same for an
   * all-cash buyer. Cash-on-cash return is meaningless without it, and
   * substituting the price would report a cash buyer's return to someone who
   * used a mortgage.
   */
  cashInvested?: number;
}

const known = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

/**
 * What the property is worth today, falling back to what was paid.
 *
 * A currentValue of 0 is a real figure — a property written down to nothing —
 * so the fallback tests for absence, not falsiness.
 */
export function valueOf(p: PropertyInvestment): number | null {
  if (known(p.currentValue)) return p.currentValue;
  if (known(p.purchasePrice)) return p.purchasePrice;
  return null;
}

/** Gain or loss against the purchase price, in dollars and percent. */
export function appreciation(
  p: PropertyInvestment
): { amount: number; percent: number } | null {
  if (!known(p.purchasePrice) || !known(p.currentValue)) return null;
  // A price of zero has no meaningful percentage — inherited or gifted.
  if (p.purchasePrice === 0) return null;

  const amount = p.currentValue - p.purchasePrice;
  return { amount, percent: (amount / p.purchasePrice) * 100 };
}

/**
 * Annual net operating income as a percent of value.
 *
 * NOI deliberately excludes mortgage payments: a cap rate describes the
 * property, not how it was financed, so two owners of identical buildings with
 * different loans should see the same figure.
 */
export function capRate(
  annualNetOperatingIncome: number,
  value: number | null | undefined
): number | null {
  if (!known(value) || value === 0) return null;
  return (annualNetOperatingIncome / value) * 100;
}

/**
 * Annual pre-tax cash flow as a percent of cash invested.
 *
 * Unlike cap rate this one does count the mortgage, because it answers what the
 * owner's own money is earning.
 */
export function cashOnCash(
  annualCashFlow: number,
  cashInvested: number | null | undefined
): number | null {
  if (!known(cashInvested) || cashInvested === 0) return null;
  return (annualCashFlow / cashInvested) * 100;
}

/**
 * Portfolio value, with a count of how many properties could not be valued.
 *
 * The count travels with the total so the UI can say "across 4 of 6
 * properties" rather than presenting a partial sum as the whole portfolio.
 */
export function portfolioValue(properties: PropertyInvestment[]): {
  total: number;
  valued: number;
  unvalued: number;
} {
  let total = 0;
  let valued = 0;
  let unvalued = 0;

  for (const property of properties) {
    const value = valueOf(property);
    if (value === null) {
      unvalued += 1;
      continue;
    }
    total += value;
    valued += 1;
  }

  return { total, valued, unvalued };
}
