import { useMemo, useReducer, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Doc, Id } from '@/../convex/_generated/dataModel';
import {
  UtilityBillFilters,
  UtilityBillData,
  UseUtilityBillsDataReturn,
} from '@/types/utilityBills';
import {
  utilityBillFilterReducer,
  initialFilterState,
} from '@/utils/filterReducer';
import {
  filterBills,
  filterCharges,
  calculateFilteredStats,
  useDebounce,
} from '@/utils/clientSideFilters';

// Custom hook for utility bills data with integrated filtering
export function useUtilityBillsData(
  initialFilters?: Partial<UtilityBillFilters>
): UseUtilityBillsDataReturn {
  const { user } = useUser();
  
  // Initialize filter state with any provided initial filters
  const [filterState, dispatch] = useReducer(utilityBillFilterReducer, {
    ...initialFilterState,
    filters: { ...initialFilterState.filters, ...initialFilters },
  });

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(filterState.filters.searchTerm || '', 300);
  
  // Create debounced filters for the query
  const debouncedFilters = useMemo(() => ({
    ...filterState.filters,
    searchTerm: debouncedSearchTerm,
  }), [filterState.filters, debouncedSearchTerm]);

  // Extract query parameters from filters
  const queryParams = useMemo(() => {
    const params: {
      userId: string;
      propertyId?: Id<"properties">;
      startMonth?: string;
      endMonth?: string;
    } = {
      userId: user?.id || '',
    };

    if (debouncedFilters.propertyId) {
      params.propertyId = debouncedFilters.propertyId;
    }

    if (debouncedFilters.dateRange) {
      const [startMonth, endMonth] = debouncedFilters.dateRange;
      params.startMonth = startMonth;
      params.endMonth = endMonth;
    }

    return params;
  }, [user?.id, debouncedFilters.propertyId, debouncedFilters.dateRange]);

  // Single query to get all page data
  const pageData = useQuery(
    api.utilityBills.getUtilityPageData,
    user ? queryParams : "skip"
  );

  // Process and filter the data client-side for instant response
  const filteredData = useMemo(() => {
    if (!pageData) return null;

    // Apply client-side filters to bills
    const filteredBills = filterBills(pageData.bills, debouncedFilters);
    
    // Create set of filtered bill IDs for efficient charge filtering
    const filteredBillIds = new Set(filteredBills.map(bill => bill._id));
    
    // Filter charges based on filtered bills and tenant selection
    const filteredCharges = filterCharges(pageData.charges, filteredBillIds, debouncedFilters);
    
    // Calculate stats for filtered data
    const stats = calculateFilteredStats(filteredBills, filteredCharges, debouncedFilters);

    return {
      bills: filteredBills,
      charges: filteredCharges,
      stats,
    };
  }, [pageData, debouncedFilters]);

  // Callback to update filters
  const updateFilters = useCallback((updates: Partial<UtilityBillFilters>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: updates });
  }, []);

  // Callback to reset filters
  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  // Update filter state when data changes
  useMemo(() => {
    if (pageData) {
      dispatch({ type: 'SET_DATA', payload: pageData });
    }
  }, [pageData]);

  return {
    data: pageData || null,
    filteredData,
    filters: filterState.filters,
    loading: pageData === undefined,
    error: null, // TODO: Add error handling
    updateFilters,
    resetFilters,
  };
}

// Hook specifically for getting property and lease options for filters
export function useUtilityBillFilterOptions(propertyId?: Id<"properties">) {
  const { user } = useUser();
  
  // Get basic data for filter options
  const pageData = useQuery(
    api.utilityBills.getUtilityPageData,
    user ? { 
      userId: user.id,
      propertyId,
    } : "skip"
  );

  return useMemo(() => {
    if (!pageData) return { properties: [], leases: [], utilityTypes: [] };

    // Extract unique utility types from bills
    const utilityTypes = Array.from(
      new Set(pageData.bills.map(bill => bill.utilityType))
    ).sort();

    // Filter leases by property if specified
    const leases = propertyId 
      ? pageData.leases.filter(lease => lease.propertyId === propertyId)
      : pageData.leases;

    return {
      properties: pageData.properties,
      leases,
      utilityTypes,
    };
  }, [pageData, propertyId]);
}