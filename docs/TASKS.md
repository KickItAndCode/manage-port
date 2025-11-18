# Tasks - What to Work On Next

**Last Updated**: January 27, 2025  
**Current Phase**: Phase 3 - Experience Deepening

---

## 🎯 Current Priority: TBD

**Status**: Reviewing next priorities

### Tasks

1. **Create Activity Timeline Component**
   - Build timeline UI component showing chronological events
   - Display events with icons, timestamps, and descriptions
   - Support for different event types (property, lease, document, utility)

2. **Add Audit Event Logging Backend**
   - Create `convex/activityLog.ts` for event storage
   - Log key actions: property creation, lease changes, document uploads, utility bill entries
   - Store: userId, entityType, entityId, action, timestamp, metadata

3. **Show Property/Lease Activity History**
   - Query and display activities for specific properties
   - Query and display activities for specific leases
   - Link activities to related entities

4. **Add Activity Filters**
   - Filter by date range (last week, month, quarter, year, all time)
   - Filter by activity type (property, lease, document, utility)
   - Filter by property (if viewing all activities)
   - Search activities by description

### Files to Create/Modify

```
src/components/
└── ActivityTimeline.tsx            # NEW - Timeline component

convex/
└── activityLog.ts                  # NEW - Activity logging and queries

src/app/
├── properties/[id]/page.tsx        # Add activity timeline section
└── leases/[id]/page.tsx            # Add activity timeline section (if exists)
```

### Success Criteria

- [x] Activity timeline shows last 30 days of events
- [x] All property/lease/document/utility actions are logged
- [x] Timeline filters work correctly
- [x] Timeline loads in <1s for typical user

### ✅ Completed (January 27, 2025)

- ✅ Created `activityLog` table in schema
- ✅ Created `convex/activityLog.ts` with logging and query functions
- ✅ Created `ActivityTimeline.tsx` component with filters (date range, type, search)
- ✅ Added activity logging to property mutations (create, update, delete)
- ✅ Added activity logging to document uploads
- ✅ Added activity logging to utility bill creation
- ✅ Integrated ActivityTimeline into property detail page sidebar

---

## 📋 Next Up: Notification Center UI (Track 3)

**Estimated Time**: 2-3 hours  
**Status**: ✅ COMPLETE (January 27, 2025)

### Tasks

1. **Build Notification Center Component**
   - Create notification center UI (dropdown or sidebar panel)
   - Display list of notifications with icons and timestamps
   - Group by read/unread status

2. **Show Notification History**
   - Query notifications from backend
   - Display notification types: Lease Expiration, Payment Reminders, Utility Bill Reminders
   - Show notification details and related entities

3. **Add Mark as Read/Unread Functionality**
   - Toggle read status for individual notifications
   - Mark all as read button
   - Visual distinction between read/unread

4. **Real-time Notification Updates**
   - Use Convex subscriptions for live updates
   - Show notification badge with count
   - Animate new notifications appearing

5. **Notification Generation**
   - Generate notifications from utility reminders (overdue bills, missing readings)
   - Generate lease expiration notifications
   - Integrate notification generation into cron jobs or on-demand triggers

### Files Created/Modified

```
src/components/
├── NotificationCenter.tsx          # ✅ Created - Notification center component
└── ui/scroll-area.tsx              # ✅ Created - ScrollArea component

convex/
├── notifications.ts                # ✅ Created - Notification queries and mutations
├── utilityInsights.ts              # ✅ Modified - Added notification generation
└── leases.ts                       # ✅ Modified - Added lease expiration notifications

src/components/
└── ResponsiveSidebar.tsx          # ✅ Modified - Added notification bell icon/badge
```

### Success Criteria

- [x] Notification center shows all alerts in one place
- [x] Real-time alerts appear via Convex subscriptions
- [x] Mark as read/unread works correctly
- [x] Notification badge shows unread count
- [x] Notification generation for utility reminders
- [x] Notification generation for lease expirations

### ✅ Completed (January 27, 2025)

- ✅ Created `notifications` table in schema
- ✅ Created `convex/notifications.ts` with queries and mutations
- ✅ Created `NotificationCenter.tsx` component with popover UI
- ✅ Added notification bell icon/badge to `ResponsiveSidebar`
- ✅ Integrated real-time updates using Convex subscriptions (via `useQuery`)
- ✅ Added `generateNotificationsFromReminders` mutation for utility reminders
- ✅ Added `generateLeaseExpirationNotifications` mutation for lease expirations

---

## 🔮 Future Tasks (Lower Priority)

### Bulk Tagging Operations (Track 2)
- Add UI for selecting multiple documents
- Bulk tag assignment interface
- Estimated: 1-2 hours

### Email/SMS Integration (Track 3)
- Integrate email service (SendGrid, Resend, etc.)
- Integrate SMS service (Twilio, etc.)
- Scheduled digest emails
- Estimated: 4-6 hours (requires external service setup)

### Scheduled Reminder Cron Jobs (Track 3)
- Cron jobs for overdue bill checks
- Missing reading reminders
- Lease expiration alerts
- Estimated: 2-3 hours (after email/SMS integration)

### Performance Optimizations
- Optimize dashboard queries
- Add pagination for large lists
- Implement caching strategies
- Estimated: 3-4 hours

---

## ✅ Recently Completed

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

