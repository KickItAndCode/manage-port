/**
 * Money is allocated in integer cents.
 *
 * Percentage splits were previously computed as `total * pct / 100` in floating
 * point. Two problems followed. The preview rounded the result to cents while
 * the path that actually persisted charges did not, so the figure a landlord
 * approved was not the figure stored. And rounding each tenant's share
 * independently means the shares need not add back up to the bill: three equal
 * shares of $100 round to $33.33 each and lose a penny.
 *
 * allocateCents does the arithmetic once, in cents, and hands out any leftover
 * pennies by largest fractional remainder. The parts always sum to the whole.
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}

export interface Share<T> {
  item: T;
  /** 0-100. */
  percentage: number;
}

export interface Allocation<T> {
  item: T;
  percentage: number;
  cents: number;
  amount: number;
}

export interface AllocationResult<T> {
  allocations: Array<Allocation<T>>;
  /** Whatever is left for the owner once tenant shares are taken out. */
  ownerCents: number;
  ownerAmount: number;
  totalPercentage: number;
}

/**
 * Splits `totalAmount` across `shares` by percentage.
 *
 * Each allocation is the floor of its exact cent value; the pennies lost to
 * flooring are then given to the shares with the largest fractional remainders,
 * so `sum(allocations) + owner === toCents(totalAmount)` exactly. Ties break
 * toward the earlier share, which keeps the result stable for a given input
 * order.
 */
export function allocateCents<T>(
  totalAmount: number,
  shares: Array<Share<T>>,
): AllocationResult<T> {
  const totalCents = toCents(totalAmount);
  const totalPercentage = shares.reduce((sum, s) => sum + s.percentage, 0);

  // Exact cent value each share is owed, split into whole and fractional parts.
  const exact = shares.map((share, index) => {
    const value = (totalCents * share.percentage) / 100;
    const floor = Math.floor(value);
    return { index, share, floor, remainder: value - floor };
  });

  // The tenant block as a whole rounds once, so the owner absorbs only a
  // genuine remainder rather than the sum of many rounding errors.
  const tenantTarget = Math.round((totalCents * totalPercentage) / 100);
  const floorSum = exact.reduce((sum, e) => sum + e.floor, 0);
  let pennies = tenantTarget - floorSum;

  const byRemainder = [...exact].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  const extra = new Map<number, number>();
  for (let i = 0; pennies > 0 && i < byRemainder.length; i++, pennies--) {
    extra.set(byRemainder[i].index, 1);
  }
  // Guard the over-allocated case (percentages summing past 100).
  for (let i = byRemainder.length - 1; pennies < 0 && i >= 0; i--, pennies++) {
    extra.set(byRemainder[i].index, (extra.get(byRemainder[i].index) ?? 0) - 1);
  }

  const allocations = exact.map((e) => {
    const cents = e.floor + (extra.get(e.index) ?? 0);
    return {
      item: e.share.item,
      percentage: e.share.percentage,
      cents,
      amount: toDollars(cents),
    };
  });

  const allocatedCents = allocations.reduce((sum, a) => sum + a.cents, 0);
  const ownerCents = totalCents - allocatedCents;

  return {
    allocations,
    ownerCents,
    ownerAmount: toDollars(ownerCents),
    totalPercentage,
  };
}
