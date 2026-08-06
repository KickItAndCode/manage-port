/**
 * Lease Status Computation Utilities
 *
 * These utilities provide computed lease status based on dates,
 * eliminating the need for manual status management.
 *
 * getLeaseStatus itself lives in convex/lib/leaseStatus.ts and is re-exported
 * here. The backend derives status with the same function, so what the UI shows
 * and what billing acts on cannot drift apart. Everything below is
 * presentation-only and stays client-side.
 */

export { getLeaseStatus } from "@/../convex/lib/leaseStatus";
export type { LeaseStatus } from "@/../convex/lib/leaseStatus";

import { getLeaseStatus } from "@/../convex/lib/leaseStatus";
import type { LeaseStatus } from "@/../convex/lib/leaseStatus";
import { daysUntil } from "@/utils/utilityBillHelpers";

/**
 * Check if a lease has conflicts with other leases
 * @param lease - The lease to check
 * @param allLeases - All leases for the property/unit
 * @returns Object with conflict status and details
 */
export function getLeaseStatusWithConflicts(
  lease: { 
    _id: string; 
    startDate: string; 
    endDate: string; 
    unitId?: string;
    propertyId: string;
  },
  allLeases: Array<{
    _id: string;
    startDate: string;
    endDate: string;
    unitId?: string;
    propertyId: string;
  }>
) {
  const status = getLeaseStatus(lease.startDate, lease.endDate);
  
  // Only check for conflicts if this lease is active
  if (status !== "active") {
    return { status, hasConflict: false };
  }
  
  // Find other active leases for the same property/unit
  const conflictingLeases = allLeases.filter(otherLease => {
    // Skip self
    if (otherLease._id === lease._id) return false;
    
    // Check if it's the same unit (or both have no unit)
    const sameUnit = lease.unitId 
      ? otherLease.unitId === lease.unitId 
      : (!otherLease.unitId && otherLease.propertyId === lease.propertyId);
    
    if (!sameUnit) return false;
    
    // Check if other lease is also active
    const otherStatus = getLeaseStatus(otherLease.startDate, otherLease.endDate);
    return otherStatus === "active";
  });
  
  return {
    status,
    hasConflict: conflictingLeases.length > 0,
    conflictingLeases
  };
}

/**
 * Calculate days until lease expiry
 * @param endDate - ISO date string for lease end
 * @returns Number of days until expiry (negative if already expired)
 */
export function getDaysUntilExpiry(endDate: string): number {
  // Was: new Date(endDate) followed by setHours(0,0,0,0). The constructor reads
  // a YYYY-MM-DD string as UTC midnight and setHours then moves it to *local*
  // midnight, landing on the previous day anywhere west of Greenwich. The
  // result was off by one for most of the day, and the error only showed up
  // once the local clock crossed into a different UTC date.
  return daysUntil(endDate);
}

/**
 * Check if lease is expiring soon (within specified days)
 * @param endDate - ISO date string for lease end
 * @param withinDays - Number of days to check (default 60)
 * @returns Boolean indicating if lease expires within the specified days
 */
export function isExpiringSoon(endDate: string, withinDays: number = 60): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(endDate);
  return daysUntilExpiry >= 0 && daysUntilExpiry <= withinDays;
}

/**
 * Get a human-readable status description
 * @param status - The computed lease status
 * @param daysUntilExpiry - Optional days until expiry for active leases
 * @returns Human-readable status description
 */
export function getStatusDescription(status: LeaseStatus, daysUntilExpiry?: number): string {
  switch (status) {
    case "active":
      if (daysUntilExpiry !== undefined) {
        if (daysUntilExpiry === 0) return "Expires today";
        if (daysUntilExpiry === 1) return "Expires tomorrow";
        if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
        if (daysUntilExpiry <= 30) return `Expires in ${Math.floor(daysUntilExpiry / 7)} weeks`;
        if (daysUntilExpiry <= 60) return "Expires soon";
      }
      return "Active lease";
    case "pending":
      return "Lease not yet started";
    case "expired":
      return "Lease has expired";
    default:
      return "Unknown status";
  }
}

/**
 * Sort leases by computed status priority and dates
 * @param leases - Array of leases to sort
 * @returns Sorted array with active first, then pending, then expired
 */
export function sortLeasesByStatus<T extends { startDate: string; endDate: string }>(
  leases: T[]
): T[] {
  return [...leases].sort((a, b) => {
    const statusA = getLeaseStatus(a.startDate, a.endDate);
    const statusB = getLeaseStatus(b.startDate, b.endDate);
    
    // Status priority: active > pending > expired
    const statusPriority = { active: 0, pending: 1, expired: 2 };
    const priorityDiff = statusPriority[statusA] - statusPriority[statusB];
    
    if (priorityDiff !== 0) return priorityDiff;

    // Within the same status, sort by the date that matters for that status.
    // Dates are YYYY-MM-DD, so string comparison orders them correctly and
    // avoids the timezone shifts that Date parsing introduces.
    if (statusA === "active") {
      // Soonest expiry first — those are the ones needing attention.
      return a.endDate.localeCompare(b.endDate);
    }
    if (statusA === "expired") {
      // Most recently expired first; a lease that lapsed years ago is the
      // least interesting thing on the list.
      return b.endDate.localeCompare(a.endDate);
    }
    // Pending: soonest to start first.
    return a.startDate.localeCompare(b.startDate);
  });
}