/**
 * Lease status is derived from dates — it is never stored.
 *
 * The leases table still carries a `status` column, but it was only ever
 * written at create/update time and nothing recomputed it afterwards, so it
 * drifted: a lease that had ended still read "active" and kept generating
 * utility charges, while the UI (which already computed status from dates)
 * displayed it as expired.
 *
 * This module is the single source of truth for both runtimes. src/ imports it
 * directly so the client and the backend can never disagree.
 *
 * Comparisons run on plain YYYY-MM-DD strings in UTC. Using Date objects and
 * local time would make the answer depend on where the code runs — the browser
 * and the Convex server sit in different zones — which is the same class of
 * bug as storing the value.
 */

export type LeaseStatus = "active" | "expired" | "pending";

/** The UTC calendar day, as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Normalizes an ISO date or datetime string to its YYYY-MM-DD day. */
function day(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/**
 * Computes lease status from its dates.
 * A lease is active from its start date through its end date, inclusive.
 */
export function getLeaseStatus(
  startDate: string,
  endDate: string,
  now: string = today(),
): LeaseStatus {
  if (day(startDate) > now) return "pending";
  if (day(endDate) < now) return "expired";
  return "active";
}

/** True when the lease is active on the given day. */
export function isActive(
  lease: { startDate: string; endDate: string },
  now: string = today(),
): boolean {
  return getLeaseStatus(lease.startDate, lease.endDate, now) === "active";
}

/** Filters a collection down to the leases active on the given day. */
export function filterActiveLeases<T extends { startDate: string; endDate: string }>(
  leases: T[],
  now: string = today(),
): T[] {
  return leases.filter((lease) => isActive(lease, now));
}
