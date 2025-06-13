# Computed Lease Status Feature

## Overview
Transform lease status from manually-managed field to automatically computed value based on lease start/end dates. This eliminates manual status management errors and ensures status accuracy.

## Current State Analysis

### Existing Infrastructure
- **Status Field**: Currently stores `"active"`, `"expired"`, or `"pending"` manually
- **Unused Automation**: `updateLeaseStatuses` function exists but is never called
- **Date Fields**: `startDate` and `endDate` are the source of truth for lease timeline
- **UI Dependencies**: Status badges, filtering, and business logic depend on status field

### Key Discovery
The codebase already has complete automatic status derivation logic that's never being used. This presents an opportunity to activate existing infrastructure rather than building from scratch.

## Implementation Plan: UI-Derived Status (No Cron Jobs)

### Approach: Computed Status with DB Cleanup
Remove the stored `status` field entirely and derive it on-demand in the UI and queries.

### Phase 1: Create Status Derivation Utilities (1 day)

**1. Utility Functions**
- Create `getLeaseStatus(startDate, endDate)` helper function
- Add `getLeaseStatusWithConflicts(lease, allLeases)` for business rules
- Build React hooks: `useLeaseStatus()` and `useLeaseStatuses()`

**2. Update UI Components**
- Replace all `lease.status` references with derived status calls
- Update StatusBadge component to accept computed status
- Modify lease forms to show computed status (read-only)

### Phase 2: Update Backend Queries (1-2 days)

**3. Convex Query Updates**
- Modify `getActiveLeases` to filter by date ranges instead of status field
- Update dashboard queries to compute status on-the-fly
- Add query helpers for date-based filtering

**4. Remove Status Field Dependencies**
- Remove status from lease creation/update forms
- Update validation logic to use date-based rules
- Maintain unit status sync using derived status

### Phase 3: Schema Migration (1 day)

**5. Gradual Field Removal**
- Mark status field as optional in schema
- Add migration script to remove status from existing leases
- Update all remaining references to use derived status

## Key Benefits

- **Always Accurate**: Status is computed from source of truth (dates)
- **No Sync Issues**: Eliminates manual/automatic status conflicts
- **Simpler Logic**: Removes status update complexity
- **Real-time**: Status changes immediately when viewing UI
- **Eliminates Manual Errors**: No more incorrect status selections

## Implementation Notes

- Use React hooks for consistent status derivation across components
- Cache computed status in queries to avoid repeated calculations
- Handle edge cases (missing dates, overlapping leases) gracefully
- Maintain backward compatibility during transition period

## Status Derivation Logic

```typescript
function getLeaseStatus(startDate: string, endDate: string): LeaseStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > now) return "pending";
  if (end < now) return "expired";
  return "active";
}
```

## Files to Modify

### Core Files
- `/convex/schema.ts` - Remove status field
- `/convex/leases.ts` - Update queries to use date-based filtering
- `/src/components/LeaseForm.tsx` - Remove manual status selection
- `/src/components/ui/status-badge.tsx` - Accept computed status

### Utility Files to Create
- `/src/lib/lease-status.ts` - Status derivation utilities
- `/src/hooks/use-lease-status.ts` - React hooks for status computation

## Testing Considerations

- Test edge cases: leases starting/ending today
- Verify business rules: one active lease per unit
- Check UI updates in real-time
- Validate query performance with computed status
- Test migration from manual to computed status

## Alternative Approaches Considered

1. **Cron Job Automation**: Keep status field but update automatically (rejected - adds complexity)
2. **Hybrid Approach**: Allow manual override of computed status (rejected - defeats purpose)
3. **Event-Driven Updates**: Update status on specific triggers (rejected - still requires sync)

## Success Metrics

- Zero manual status selection errors
- Consistent status across all UI components
- Improved query performance (no status updates needed)
- Reduced codebase complexity (remove status update logic)