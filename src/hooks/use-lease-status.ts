/**
 * React Hooks for Lease Status Computation
 * 
 * These hooks provide reactive lease status computation that updates
 * automatically when dates change or time passes.
 */

import { useEffect, useState, useMemo } from "react";
import { getLeaseStatus, getLeaseStatusWithConflicts, getDaysUntilExpiry, type LeaseStatus } from "@/lib/lease-status";

/**
 * Hook to compute lease status for a single lease
 * Updates automatically at midnight when status might change
 */
export function useLeaseStatus(startDate: string, endDate: string) {
  const [, setTick] = useState(0);
  
  // Force re-render at midnight
  useEffect(() => {
    const checkInterval = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeout = setTimeout(() => {
        setTick(t => t + 1);
        checkInterval(); // Schedule next check
      }, msUntilMidnight);
      
      return () => clearTimeout(timeout);
    };
    
    const cleanup = checkInterval();
    return cleanup;
  }, []);
  
  const status = useMemo(() => getLeaseStatus(startDate, endDate), [startDate, endDate]);
  const daysUntilExpiry = useMemo(() => getDaysUntilExpiry(endDate), [endDate]);
  
  return { status, daysUntilExpiry };
}

/**
 * Hook to compute status for multiple leases
 * Includes conflict detection for active leases
 */
export function useLeaseStatuses<T extends { 
  _id: string; 
  startDate: string; 
  endDate: string; 
  unitId?: string;
  propertyId: string;
}>(leases: T[]) {
  const [, setTick] = useState(0);
  
  // Force re-render at midnight
  useEffect(() => {
    const checkInterval = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeout = setTimeout(() => {
        setTick(t => t + 1);
        checkInterval();
      }, msUntilMidnight);
      
      return () => clearTimeout(timeout);
    };
    
    const cleanup = checkInterval();
    return cleanup;
  }, []);
  
  const leasesWithStatus = useMemo(() => {
    return leases.map(lease => {
      const statusInfo = getLeaseStatusWithConflicts(lease, leases);
      const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
      
      return {
        ...lease,
        computedStatus: statusInfo.status,
        hasConflict: statusInfo.hasConflict,
        conflictingLeases: statusInfo.conflictingLeases,
        daysUntilExpiry
      };
    });
  }, [leases]);
  
  return leasesWithStatus;
}

/**
 * Hook to get computed status for a lease with automatic updates
 * Useful for single lease views where you want real-time status
 */
export function useComputedLeaseStatus(lease: {
  startDate: string;
  endDate: string;
} | null | undefined): {
  status: LeaseStatus | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
} {
  const [, setTick] = useState(0);
  
  // Force re-render at midnight
  useEffect(() => {
    if (!lease) return;
    
    const checkInterval = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeout = setTimeout(() => {
        setTick(t => t + 1);
        checkInterval();
      }, msUntilMidnight);
      
      return () => clearTimeout(timeout);
    };
    
    const cleanup = checkInterval();
    return cleanup;
  }, [lease]);
  
  if (!lease) {
    return { status: null, daysUntilExpiry: null, isExpiringSoon: false };
  }
  
  const status = getLeaseStatus(lease.startDate, lease.endDate);
  const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
  const isExpiringSoon = status === "active" && daysUntilExpiry >= 0 && daysUntilExpiry <= 60;
  
  return { status, daysUntilExpiry, isExpiringSoon };
}

/**
 * Hook to filter leases by computed status
 * Useful for dashboard views that need to show active/pending/expired counts
 */
export function useFilteredLeasesByStatus<T extends { startDate: string; endDate: string }>(
  leases: T[]
): {
  all: T[];
  active: T[];
  pending: T[];
  expired: T[];
  expiringSoon: T[];
} {
  const [, setTick] = useState(0);
  
  // Force re-render at midnight
  useEffect(() => {
    const checkInterval = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeout = setTimeout(() => {
        setTick(t => t + 1);
        checkInterval();
      }, msUntilMidnight);
      
      return () => clearTimeout(timeout);
    };
    
    const cleanup = checkInterval();
    return cleanup;
  }, []);
  
  return useMemo(() => {
    const active: T[] = [];
    const pending: T[] = [];
    const expired: T[] = [];
    const expiringSoon: T[] = [];
    
    leases.forEach(lease => {
      const status = getLeaseStatus(lease.startDate, lease.endDate);
      
      switch (status) {
        case "active":
          active.push(lease);
          const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
          if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
            expiringSoon.push(lease);
          }
          break;
        case "pending":
          pending.push(lease);
          break;
        case "expired":
          expired.push(lease);
          break;
      }
    });
    
    return {
      all: leases,
      active,
      pending,
      expired,
      expiringSoon
    };
  }, [leases]);
}