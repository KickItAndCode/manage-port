import { Doc, Id } from "@/../convex/_generated/dataModel";
import { UtilityBillFilters, UtilityBillStats } from "@/types/utilityBills";

// Pure function to filter bills based on current filters
export function filterBills(
  bills: Array<Doc<"utilityBills">>,
  filters: UtilityBillFilters
): Array<Doc<"utilityBills">> {
  let filtered = [...bills];

  // Filter by property
  if (filters.propertyId) {
    filtered = filtered.filter(bill => bill.propertyId === filters.propertyId);
  }

  // Filter by date range
  if (filters.dateRange) {
    const [startMonth, endMonth] = filters.dateRange;
    filtered = filtered.filter(bill => 
      bill.billMonth >= startMonth && bill.billMonth <= endMonth
    );
  }

  // Filter by utility types
  if (filters.utilityTypes && filters.utilityTypes.length > 0) {
    filtered = filtered.filter(bill => 
      filters.utilityTypes!.includes(bill.utilityType)
    );
  }

  // Filter by paid status
  if (filters.paidStatus && filters.paidStatus !== 'all') {
    const isPaid = filters.paidStatus === 'paid';
    filtered = filtered.filter(bill => bill.landlordPaidUtilityCompany === isPaid);
  }

  // Filter by search term (search in utility type, provider, notes)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const searchLower = filters.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(bill =>
      bill.utilityType.toLowerCase().includes(searchLower) ||
      bill.provider.toLowerCase().includes(searchLower) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchLower)) ||
      bill.billMonth.includes(searchLower)
    );
  }

  return filtered;
}

// Pure function to filter charges based on current filters and tenant selection
export function filterCharges(
  charges: Array<{
    leaseId: Id<"leases">;
    unitId?: Id<"units">;
    tenantName: string;
    utilityBillId: Id<"utilityBills">;
    utilityType: string;
    billMonth: string;
    totalBillAmount: number;
    chargedAmount: number;
    responsibilityPercentage: number;
    dueDate: string;
    paidAmount: number;
    remainingAmount: number;
    unitIdentifier?: string;
  }>,
  filteredBillIds: Set<Id<"utilityBills">>,
  filters: UtilityBillFilters
): Array<{
  leaseId: Id<"leases">;
  unitId?: Id<"units">;
  tenantName: string;
  utilityBillId: Id<"utilityBills">;
  utilityType: string;
  billMonth: string;
  totalBillAmount: number;
  chargedAmount: number;
  responsibilityPercentage: number;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  unitIdentifier?: string;
}> {
  let filtered = charges.filter(charge => filteredBillIds.has(charge.utilityBillId));

  // Filter by tenant if specified
  if (filters.tenantId) {
    filtered = filtered.filter(charge => charge.leaseId === filters.tenantId);
  }

  return filtered;
}

// Pure function to calculate stats for filtered data
export function calculateFilteredStats(
  filteredBills: Array<Doc<"utilityBills">>,
  filteredCharges: Array<{
    leaseId: Id<"leases">;
    unitId?: Id<"units">;
    tenantName: string;
    utilityBillId: Id<"utilityBills">;
    utilityType: string;
    billMonth: string;
    totalBillAmount: number;
    chargedAmount: number;
    responsibilityPercentage: number;
    dueDate: string;
    paidAmount: number;
    remainingAmount: number;
    unitIdentifier?: string;
  }>,
  filters: UtilityBillFilters
): UtilityBillStats {
  const totalBills = filteredBills.length;
  const unpaidBills = filteredBills.filter(bill => !bill.landlordPaidUtilityCompany).length;

  // If tenant is selected, calculate tenant-specific amounts from charges
  if (filters.tenantId && filteredCharges.length > 0) {
    const totalAmount = filteredCharges.reduce((sum, charge) => sum + charge.chargedAmount, 0);
    const unpaidAmount = filteredCharges.reduce((sum, charge) => sum + charge.remainingAmount, 0);
    
    return {
      totalBills,
      unpaidBills,
      totalAmount,
      unpaidAmount,
    };
  } else {
    // Standard calculation for all bills
    const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const unpaidAmount = filteredBills
      .filter(bill => !bill.landlordPaidUtilityCompany)
      .reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    return {
      totalBills,
      unpaidBills,
      totalAmount,
      unpaidAmount,
    };
  }
}

// Pure function to sort bills
export function sortBills(
  bills: Array<Doc<"utilityBills">>,
  sortKey: keyof Doc<"utilityBills">,
  sortDirection: 'asc' | 'desc'
): Array<Doc<"utilityBills">> {
  return [...bills].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const compare = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? compare : -compare;
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      const compare = aVal - bVal;
      return sortDirection === 'asc' ? compare : -compare;
    }
    
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      const compare = Number(aVal) - Number(bVal);
      return sortDirection === 'asc' ? compare : -compare;
    }
    
    return 0;
  });
}

// Import React for the useDebounce hook
import React from 'react';

// Debounce utility for search
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}