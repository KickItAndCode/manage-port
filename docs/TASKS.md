# Tasks - What to Work On Next

**Last Updated**: January 27, 2025  
**Current Phase**: Phase 3 - Experience Deepening

---

## 🎯 Current Priority: Performance Optimizations

**Status**: In Progress

---

## 📋 Next Up: Performance Optimizations (Continued)

**Estimated Time**: 2-3 hours remaining  
**Status**: In Progress

### Tasks

1. **Add Pagination for Large Lists** ⏳
   - ✅ Implement pagination for documents list (COMPLETE)
   - ✅ Add pagination for properties list (COMPLETE)
   - ⏳ Add pagination for leases list
   - Add "Load More" or page-based navigation

2. **Optimize Dashboard Queries**
   - Review and optimize slow queries
   - Add missing indexes if needed
   - Implement query result caching where appropriate

3. **Implement Caching Strategies**
   - Cache frequently accessed data
   - Use React Query or similar for client-side caching
   - Optimize re-renders with React.memo where appropriate

### Files to Create/Modify

```
src/app/
├── documents/page.tsx                # ✅ Pagination added
├── properties/page.tsx                # ✅ Pagination added
└── leases/page.tsx                   # ⏳ Add pagination

convex/
├── documents.ts                      # ✅ Pagination support added
├── properties.ts                      # ✅ Pagination support added
├── dashboard.ts                       # ⏳ Optimize queries
└── [various].ts                      # ⏳ Add indexes if needed
```

### Success Criteria

- [x] Documents list pagination works smoothly (COMPLETE)
- [x] Properties list pagination works smoothly (COMPLETE)
- [ ] Leases list pagination works smoothly
- [ ] Dashboard loads in <1s for typical user
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

