# Utility Bills Page Refactor Plan

## Current Issues

### 1. Data Fetching Problems
- **N+1 Query Pattern**: `calculateChargesForBill()` in `utilityCharges.ts` runs separate queries for each bill
- **Multiple Sequential Queries**: 4 `useQuery` hooks load data separately instead of in parallel
- **Dependency Chain**: Properties → Bills → Charges → Payments creates waterfall loading
- **Over-fetching**: Loading all properties/leases when only property-specific data is needed

### 2. State Management Issues
- **Complex Filter State**: Multiple overlapping filter states (`internalFilteredData`, `internalActiveFilters`, `selectedTenant`)
- **Cascading Updates**: Filter changes trigger multiple re-renders and query re-executions
- **State Synchronization**: Manual sync between filter system and query parameters

### 3. Performance Bottlenecks
- **Real-time Calculations**: Tenant charges calculated on every page load instead of cached
- **Date Range Queries**: Complex nested filtering in Convex queries
- **Redundant Computations**: Stats calculations run on filtered data instead of optimized queries

## Proposed Solutions

### Phase 1: Database Query Optimization

#### 1.1 Create Aggregated Query Functions
```typescript
// New optimized queries in convex/utilityBills.ts
export const getUtilityBillsWithCharges = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Single query that joins bills with pre-calculated charges
    // Returns: { bills, charges, stats } in one round trip
  }
});

export const getUtilityPageData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Single query that returns ALL data needed for the page:
    // - User's properties
    // - Active leases per property
    // - Recent bills summary
    // - Outstanding charges summary
  }
});
```

#### 1.2 Add Database Indexes for Common Filters
```typescript
// In convex/schema.ts - add composite indexes
utilityBills: defineTable({
  // existing fields...
}).index("by_user_property_date", ["userId", "propertyId", "billMonth"])
  .index("by_user_date_range", ["userId", "billMonth"])
  .index("by_property_date_range", ["propertyId", "billMonth"]);
```

### Phase 2: Frontend Data Flow Refactor

#### 2.1 Replace Multiple useQuery with Single Data Hook
```typescript
// New custom hook: useUtilityBillsData
export function useUtilityBillsData(filters: UtilityBillFilters) {
  const { user } = useUser();
  
  // Single query that gets all needed data
  const pageData = useQuery(
    api.utilityBills.getUtilityPageData,
    user ? { 
      userId: user.id,
      ...filters 
    } : "skip"
  );
  
  // Memoized derived state
  const processedData = useMemo(() => {
    if (!pageData) return null;
    
    return {
      bills: pageData.bills,
      properties: pageData.properties,
      leases: pageData.leases,
      charges: pageData.charges,
      stats: pageData.stats,
      filteredBills: applyClientSideFilters(pageData.bills, filters),
    };
  }, [pageData, filters]);
  
  return {
    data: processedData,
    loading: pageData === undefined,
    error: null, // Add error handling
  };
}
```

#### 2.2 Simplify Filter Management
```typescript
// Replace complex filter state with single reducer
interface UtilityBillFilters {
  propertyId?: string;
  tenantId?: string;
  dateRange?: [string, string];
  utilityTypes?: string[];
  paidStatus?: 'all' | 'paid' | 'unpaid';
}

const [filters, setFilters] = useReducer(filtersReducer, initialFilters);

// Single update function instead of multiple setState calls
const updateFilters = useCallback((updates: Partial<UtilityBillFilters>) => {
  setFilters({ type: 'UPDATE', payload: updates });
}, []);
```

### Phase 3: Performance Optimizations

#### 3.1 Add Caching Layer
```typescript
// Cache calculated charges at the database level
export const updateUtilityBillWithCharges = mutation({
  handler: async (ctx, args) => {
    const billId = await ctx.db.insert("utilityBills", billData);
    
    // Calculate and cache charges immediately
    const charges = await calculateTenantCharges(ctx, billId, billData);
    await Promise.all(
      charges.map(charge => 
        ctx.db.insert("utilityCharges", { ...charge, billId })
      )
    );
    
    return billId;
  }
});
```

#### 3.2 Implement Virtual Scrolling for Large Lists
```typescript
// Use react-window or similar for bills list
import { FixedSizeList as List } from 'react-window';

const BillsList = ({ bills }) => (
  <List
    height={600}
    itemCount={bills.length}
    itemSize={80}
    itemData={bills}
  >
    {BillRow}
  </List>
);
```

#### 3.3 Add Debounced Search/Filtering
```typescript
const debouncedFilters = useDebounce(filters, 300);
const billsData = useUtilityBillsData(debouncedFilters);
```

### Phase 4: Code Structure Improvements

#### 4.1 Extract Business Logic
```typescript
// utils/utilityBillCalculations.ts
export const calculateBillStats = (bills: UtilityBill[]): BillStats => {
  // Pure function for stats calculations
};

export const groupBillsByProperty = (bills: UtilityBill[]): GroupedBills => {
  // Pure function for grouping
};
```

#### 4.2 Component Decomposition
```typescript
// Break down the 700+ line component
const UtilityBillsPage = () => (
  <div>
    <UtilityBillsHeader />
    <UtilityBillsFilters />
    <UtilityBillsStats />
    <UtilityBillsList />
    <UtilityBillsDialogs />
  </div>
);
```

## Implementation Priority

### High Priority (Week 1)
1. ✅ Create `getUtilityPageData` aggregated query
2. ✅ Replace multiple `useQuery` hooks with single data hook
3. ✅ Add database indexes for common filter patterns
4. ✅ Simplify filter state management

### Medium Priority (Week 2)
1. ⏳ Implement charge caching at database level
2. ⏳ Add virtual scrolling for large bill lists
3. ⏳ Extract business logic to pure functions
4. ⏳ Add comprehensive error handling

### Low Priority (Week 3)
1. 🔄 Component decomposition
2. 🔄 Add automated performance monitoring
3. 🔄 Implement advanced filtering options
4. 🔄 Add export functionality optimizations

## Expected Performance Improvements

- **Initial Load Time**: 60-80% reduction (4 queries → 1 query)
- **Filter Response Time**: 70% reduction (debounced + client-side filtering)
- **Memory Usage**: 40% reduction (virtual scrolling + optimized state)
- **Network Requests**: 75% reduction (aggregated queries + caching)

## Risk Mitigation

1. **Backward Compatibility**: Keep existing queries during transition
2. **Gradual Migration**: Feature flag new data flow
3. **Performance Monitoring**: Add metrics to track improvements
4. **Rollback Plan**: Maintain ability to revert to current implementation