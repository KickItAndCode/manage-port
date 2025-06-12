import { Doc, Id } from "@/../convex/_generated/dataModel";

// Filter types for utility bills
export interface UtilityBillFilters {
  propertyId?: Id<"properties">;
  tenantId?: Id<"leases">;
  dateRange?: [string, string]; // [startMonth, endMonth] in YYYY-MM format
  utilityTypes?: string[];
  paidStatus?: 'all' | 'paid' | 'unpaid';
  searchTerm?: string;
}

// Extended utility bill type with calculated data
export interface UtilityBillWithCharges extends Doc<"utilityBills"> {
  charges?: Array<{
    leaseId: Id<"leases">;
    unitId?: Id<"units">;
    tenantName: string;
    chargedAmount: number;
    responsibilityPercentage: number;
    paidAmount: number;
    remainingAmount: number;
    unitIdentifier?: string;
  }>;
}

// Aggregated data structure for the page
export interface UtilityBillData {
  properties: Array<Doc<"properties"> & { monthlyRent: number }>;
  leases: Array<Doc<"leases"> & { unit?: Doc<"units"> }>;
  bills: Array<Doc<"utilityBills">>;
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
  }>;
  stats: UtilityBillStats;
}

// Statistics for utility bills
export interface UtilityBillStats {
  totalBills: number;
  unpaidBills: number;
  totalAmount: number;
  unpaidAmount: number;
}

// Filter state for reducer
export interface UtilityBillFilterState {
  filters: UtilityBillFilters;
  filteredBills: Array<Doc<"utilityBills">>;
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
  }>;
  stats: UtilityBillStats;
}

// Filter actions for reducer
export type UtilityBillFilterAction =
  | { type: 'UPDATE_FILTERS'; payload: Partial<UtilityBillFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_DATA'; payload: UtilityBillData };

// Hook return type
export interface UseUtilityBillsDataReturn {
  data: UtilityBillData | null;
  filteredData: {
    bills: Array<Doc<"utilityBills">>;
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
    }>;
    stats: UtilityBillStats;
  } | null;
  filters: UtilityBillFilters;
  loading: boolean;
  error: string | null;
  updateFilters: (updates: Partial<UtilityBillFilters>) => void;
  resetFilters: () => void;
}