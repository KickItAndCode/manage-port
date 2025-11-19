# Tasks - What to Work On Next

**Last Updated**: January 27, 2025  
**Current Phase**: Phase 3 - Experience Deepening

---

## 🎯 Current Priority: Additional Performance Optimizations

**Status**: Ready to Start  
**Estimated Time**: 1-2 hours

---

## 📋 Next Up: Additional Performance Optimizations

**Priority**: Medium  
**Status**: Pending

### Task Details

Now that caching strategies are implemented, verify the improvements work correctly and identify any remaining performance opportunities.

**Steps**:
1. **Test caching improvements**:
   - Open React DevTools Profiler
   - Navigate to dashboard and interact with filters
   - Verify components only re-render when props actually change
   - Check that memoized components skip unnecessary renders

2. **Measure dashboard performance**:
   - Use browser DevTools Network tab to measure load times
   - Test with different data sizes (small vs large property lists)
   - Verify dashboard loads in <1s for typical user
   - Document baseline performance metrics

3. **Review other queries for optimization**:
   - Check `convex/utilityBills.ts` for query optimization opportunities
   - Review `convex/leases.ts` for any remaining filter() calls
   - Look for opportunities to add indexes or batch queries

4. **Profile with React DevTools**:
   - Record a performance profile of dashboard interactions
   - Identify any remaining expensive renders
   - Verify no unnecessary re-renders occur

5. **Consider query result caching** (if needed):
   - Evaluate if Convex's built-in caching is sufficient
   - Consider React Query or SWR only if significant benefit

**Files to Review**:
- `convex/utilityBills.ts` - Check for query optimization opportunities
- `convex/leases.ts` - Review query patterns
- `src/app/dashboard/page.tsx` - Profile render performance
- Other frequently used queries

**Success Criteria**:
- [ ] Dashboard loads in <1s for typical user (verified)
- [ ] Large lists (100+ items) load efficiently
- [ ] No unnecessary re-renders (verified with React DevTools Profiler)
- [ ] Performance metrics documented in CURRENT_STATUS.md
- [ ] Any remaining optimization opportunities identified

---

## 📋 Future Tasks

### Additional Performance Optimizations
- Review other queries for optimization opportunities
- Consider implementing query result caching if needed
- Monitor dashboard load times in production
- Estimated: 1-2 hours

### Files to Create/Modify

```
src/app/
├── documents/page.tsx                # ✅ Pagination added
├── properties/page.tsx                # ✅ Pagination added
└── leases/page.tsx                   # ✅ Pagination added

convex/
├── documents.ts                      # ✅ Pagination support added
├── properties.ts                      # ✅ Pagination support added
├── leases.ts                         # ✅ Pagination support added
├── dashboard.ts                       # ✅ Queries optimized
└── schema.ts                         # ✅ Indexes added
```

### Success Criteria

- [x] Documents list pagination works smoothly (COMPLETE)
- [x] Properties list pagination works smoothly (COMPLETE)
- [x] Leases list pagination works smoothly (COMPLETE)
- [x] Dashboard queries optimized with indexes (COMPLETE)
- [ ] Dashboard loads in <1s for typical user (needs testing)
- [ ] Large lists (100+ items) load efficiently
- [ ] No unnecessary re-renders

---

## 🔮 Future Tasks (Lower Priority)

### Email/SMS Integration (Track 3)
- Integrate email service (SendGrid, Resend, etc.)
- Integrate SMS service (Twilio, etc.)
- Scheduled digest emails
- Estimated: 4-6 hours (requires external service setup)

### Performance Optimizations
- Optimize dashboard queries
- Add pagination for large lists
- Implement caching strategies
- Estimated: 3-4 hours

### Scheduled Reminder Cron Jobs (Track 3) - Low Priority
- Cron jobs for overdue bill checks
- Missing reading reminders
- Lease expiration alerts
- **Note**: Moved to low priority - notifications can be generated on-demand instead
- Estimated: 2-3 hours (optional, not needed immediately)

---

## ✅ Recently Completed

### Caching Strategies Implementation (January 27, 2025)
- ✅ Added React.memo to expensive components (UtilityAnomalies, UtilityReminders, OutstandingBalances, UtilityAnalytics, InteractiveChart)
- ✅ Memoized userId prop to ensure stable reference
- ✅ Added useCallback for stable function references (handleChartNavigate, chart handlers)
- ✅ Memoized chart icons to prevent re-creation on every render
- ✅ Optimized component prop drilling (replaced user.id with memoized userId)
- ✅ Reduced unnecessary re-renders through proper memoization

### Dashboard Query Optimizations (January 27, 2025)
- ✅ Added `by_user` index to properties table
- ✅ Refactored dashboard queries to use indexes instead of `.filter()`
- ✅ Optimized properties query to use `by_user` index
- ✅ Optimized leases query to use `by_user` or `by_property` index
- ✅ Optimized utility bills query to use `by_user` or `by_property` index
- ✅ Optimized units query to batch query by propertyId using `by_property` index
- ✅ Changed from O(n) table scans to O(log n) index lookups

### Leases Pagination (January 27, 2025)
- ✅ Added pagination support to `getLeases` query (limit/offset)
- ✅ Added pagination UI to leases page (page numbers, Previous/Next)
- ✅ Auto-resets to page 1 when filters change
- ✅ Shows lease count and page info
- ✅ Updated all components using `getLeases` to handle paginated response
- ✅ Components needing all leases use `limit: 1000` to fetch everything

### UI Improvements & Bug Fixes (January 27, 2025)
- ✅ Fixed dropdown menu hover states - now uses primary/90 teal color matching navbar
- ✅ Fixed search input focus issues - added focus restoration and sessionStorage persistence
- ✅ Fixed search input blocking - removed form wrapper, improved debouncing (600ms)
- ✅ Added forwardRef support to Input component for proper ref forwarding
- ✅ Fixed duplicate Button import in properties page
- ✅ Improved mobile sidebar UI and z-index management

### Properties Pagination (January 27, 2025)
- ✅ Added pagination support to `getProperties` query (limit/offset)
- ✅ Added pagination UI to properties page (page numbers, Previous/Next)
- ✅ Auto-resets to page 1 when filters change
- ✅ Shows property count and page info
- ✅ Works with existing client-side filtering

### Documents Pagination (January 27, 2025)
- ✅ Added pagination support to `getDocuments` query (limit/offset)
- ✅ Added pagination UI to documents page (page numbers, Previous/Next)
- ✅ Auto-resets to page 1 when filters change
- ✅ Shows document count and page info
- ✅ Handles search results separately (no pagination needed)

### Bulk Tagging Operations (January 27, 2025)
- ✅ Bulk tag update mutation with add/remove support
- ✅ Bulk tag edit dialog with TagAutocomplete components
- ✅ Integrated into existing bulk actions toolbar
- ✅ Toast notifications for success/failure feedback
- ✅ Handles partial failures gracefully

### Notification Center UI (January 27, 2025)
- ✅ Notification system backend (schema, queries, mutations)
- ✅ NotificationCenter component with popover UI
- ✅ Real-time updates via Convex subscriptions
- ✅ Notification generation for utility reminders
- ✅ Notification generation for lease expirations
- ✅ Integrated notification bell into sidebar

### Activity Timelines (January 27, 2025)
- ✅ Activity log backend with schema and queries
- ✅ ActivityTimeline component with filters
- ✅ Activity logging integrated into key mutations
- ✅ Timeline integrated into property detail page

### Document Manager Enhancements (January 27, 2025)
- ✅ Enhanced drag/drop UX with animations
- ✅ Document preview component (PDF/images)
- ✅ Tag autocomplete component
- ✅ Integrated previews into documents page

### Actionable Dashboards (January 27, 2025)
- ✅ Dashboard KPIs with trends
- ✅ Quick filters (property, date range, status)
- ✅ Backend filter support
- ✅ Contextual quick actions

---

## 📝 Notes

- Focus on one task at a time
- Update this file as tasks are completed
- Move completed tasks to "Recently Completed" section
- Add new tasks as they come up

