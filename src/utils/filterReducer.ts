import { UtilityBillFilterState, UtilityBillFilterAction, UtilityBillFilters } from "@/types/utilityBills";

// Initial filter state
export const initialFilterState: UtilityBillFilterState = {
  filters: {
    propertyId: undefined,
    tenantId: undefined,
    dateRange: undefined,
    utilityTypes: [],
    paidStatus: 'all',
    searchTerm: '',
  },
  filteredBills: [],
  filteredCharges: [],
  stats: {
    totalBills: 0,
    unpaidBills: 0,
    totalAmount: 0,
    unpaidAmount: 0,
  },
};

// Filter reducer
export function utilityBillFilterReducer(
  state: UtilityBillFilterState,
  action: UtilityBillFilterAction
): UtilityBillFilterState {
  switch (action.type) {
    case 'UPDATE_FILTERS': {
      const newFilters = { ...state.filters, ...action.payload };
      
      // Validate filter dependencies
      const validatedFilters = validateFilterDependencies(newFilters);
      
      return {
        ...state,
        filters: validatedFilters,
      };
    }
    
    case 'RESET_FILTERS': {
      return {
        ...initialFilterState,
        filteredBills: state.filteredBills,
        filteredCharges: state.filteredCharges,
        stats: state.stats,
      };
    }
    
    case 'SET_DATA': {
      return {
        ...state,
        filteredBills: action.payload.bills,
        filteredCharges: action.payload.charges,
        stats: action.payload.stats,
      };
    }
    
    default:
      return state;
  }
}

// Validate filter dependencies and clear dependent filters when parent changes
function validateFilterDependencies(filters: UtilityBillFilters): UtilityBillFilters {
  const validated = { ...filters };
  
  // If property changes, clear tenant filter (tenant depends on property)
  if (filters.propertyId !== validated.propertyId) {
    validated.tenantId = undefined;
  }
  
  // Ensure utility types is always an array
  if (!Array.isArray(validated.utilityTypes)) {
    validated.utilityTypes = [];
  }
  
  // Validate date range format
  if (validated.dateRange) {
    const [start, end] = validated.dateRange;
    if (!start || !end || !start.match(/^\d{4}-\d{2}$/) || !end.match(/^\d{4}-\d{2}$/)) {
      validated.dateRange = undefined;
    }
  }
  
  return validated;
}