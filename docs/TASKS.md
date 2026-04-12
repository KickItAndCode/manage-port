# Tasks - What to Work On Next

**Last Updated**: November 19, 2025  
**Current Phase**: Phase 3 - Experience Deepening

---

## 🎯 Current Priority: Automated Utility Charge Generation

**Status**: Ready to start  
**Estimated Time**: 2-3 days

### Overview
PRD section 3.3 requires that utility charges are stored and maintained when bills are created. Today charges are still calculated on-demand, which blocks accurate payment tracking, slows the utility bills page, and prevents downstream automation.

### Steps
1. **Schema & data integrity audit**  
   - Ensure `utilityCharges` table and indexes cover FR-3 storage requirements.  
   - Write backfill script for any existing bills lacking persisted charges.
2. **Auto-generation hooks**  
   - Update `addUtilityBill`, `bulkAddUtilityBills`, and bill update/delete flows to call `generateChargesForBill`.  
   - Add idempotent re-generation (e.g., mutation to rebuild charges when percentages change).
3. **Payments & ledger integration**  
   - Update `utilityPayments` mutations/queries to reference stored charges.  
   - Surface pending/paid charge summaries in `UtilityLedger`, `UtilityBillForm`, and dashboards.
4. **Instrumentation & documentation**  
   - Emit activity log entries for charge generation failures.  
   - Update `CURRENT_STATUS.md` and PRD checklists.

**Files to Review**
- `convex/schema.ts`
- `convex/utilityBills.ts`
- `convex/utilityCharges.ts`
- `convex/utilityPayments.ts`
- `src/app/utility-bills/page.tsx`
- `src/components/UtilityLedger.tsx`

**Success Criteria**
- [ ] Charges are created immediately whenever a bill is inserted or updated.
- [ ] Re-running generation is safe and prevents duplicate charges.
- [ ] Payment and outstanding balance views read from stored charges only.
- [ ] Utility bills page renders without running N+1 calculations.
- [ ] Documentation reflects the automated pipeline.

---

## 📋 Next Up: Tenant Statement Reliability

**Priority**: High  
**Status**: Pending  
**Estimated Time**: 1-2 days

### Steps
1. Replace the deprecated `utilityPayments.getTenantStatement` query with a version that aggregates stored charges/payments.  
2. Update `TenantStatementGenerator` to rely on the new query and show error states if data is missing.  
3. Add regression tests (Convex unit + React component tests) and sample fixtures.

**Success Criteria**
- [ ] Statements pull data from stored charges, not on-demand calculations.  
- [ ] Generated PDFs/print views list totals that match ledger data.  
- [ ] Errors are surfaced when statements cannot be generated.

---

## 📋 Track: Simplify Utility Bills Experience

**Priority**: High  
**Status**: Pending discovery spike  
**Estimated Time**: 2-3 days for first pass

### Why
The current `UtilityBillsContent` tries to be mission control (stats, filters, bulk actions, ledger, statements, split previews, dialogs). We want a minimal “log a bill → review it” experience.

### Steps
1. **Split the page into focused views**
   - “Bills” tab: table + quick actions.
   - “Insights & History” tab: ledger, statements, analytics.
2. **Introduce Quick Add form**
   - Property, utility type, amount, bill month only.
   - Move provider suggestions, uploads, bulk seed, and notes behind an “Advanced details” accordion.
3. **Hide advanced/bulk tooling by default**
   - Bulk delete/mark paid, BillSplitPreview, and bulk entry belong behind an “Advanced tools” toggle.
4. **Clarify primary CTA**
   - When there are no bills, show a single “Add first bill” empty state.

**Success Criteria**
- [ ] Page defaults to Quick Add flow with < 4 required inputs.
- [ ] Bulk actions and statements are only visible after a user opts into advanced tools.
- [ ] Page load no longer instantiates every dialog/hook (verified via React Profiler).

---

## 📋 Track: Dashboard Focus & Quick Add Flows

**Priority**: Medium  
**Status**: Planning  
**Estimated Time**: 2 days

### Steps
1. Remove heavyweight modals from `src/app/dashboard/page.tsx`; deep-link quick actions to dedicated pages with URL params instead.
2. Keep only one lightweight action (e.g., “Add Property”) directly on the dashboard.
3. Update Quick Action cards to describe where users will land (“Opens Bills page filtered to Property A”).
4. Audit copy and metrics so the dashboard communicates state and routes users elsewhere.

**Success Criteria**
- [ ] Dashboard mounts zero large forms/wizards by default.
- [ ] Quick actions navigate, they do not host embedded forms.
- [ ] Empty-state messaging directs users to the simplest next screen.

---

## 📋 Track: Filter & Navigation Simplification

**Priority**: Medium  
**Status**: Backlog  
**Estimated Time**: 2-3 days

### Steps
1. Replace custom filter reducers/debounced client filtering with URL params + Convex queries (starting with `useUtilityBillsData`).
2. Standardize filter components so every page supports copyable/shareable URLs.
3. Reduce sidebar navigation to core flows (Properties, Leases, Bills, Documents, Insights) and move experimental utilities into sub-pages.

**Success Criteria**
- [ ] Utility filters are URL-driven (property, month, utility type) with zero custom reducers.
- [ ] Copying the URL reproduces filters on reload.
- [ ] Side navigation highlights only the main five experiences.

---

## 📋 High-Priority Queue

### Testing Infrastructure Revival
- Fix authentication helpers in the test harness so Convex queries/mutations run with a user context.
- Add missing `data-testid` hooks to shared UI components to unblock e2e smoke tests.
- Restore at least one happy-path Cypress (or Playwright) run that covers property creation → bill entry → statement generation.

### TypeScript Quality & Safety
- Replace remaining `any` usage in Convex modules (starting with `utilityBills.ts`, `utilityCharges.ts`, `leases.ts`).  
- Introduce shared type utilities (e.g., `UtilityBillWithCharges`) to reduce repeated casting.  
- Enable `noImplicitAny` for Convex build once hot paths are typed.

### Property Wizard & Unit Enforcement Audit
- Verify the property creation wizard enforces unit definitions for multi-family configurations.  
- Ensure `addLease` + frontend forms block creating multi-unit leases without a unit assignment.  
- Backfill analytics to confirm each multi-family property has at least one unit.

---

## 📋 Future Tasks

### Additional Performance Optimizations (Monitoring)
- Continue profiling dashboard interactions after other priorities land.  
- Track load times for 100+ item lists and capture metrics in `CURRENT_STATUS.md`.  
- Consider productizing React Query/SWR caching only if Convex caching proves insufficient.

### Email/SMS Integration (Track 3)
- Integrate email service (SendGrid, Resend, etc.) and optional SMS (Twilio).  
- Implement scheduled digest emails once notification storage stabilizes.  
- Estimated: 4-6 hours (requires external service setup).

### Scheduled Reminder Cron Jobs (Track 3) - Low Priority
- Cron jobs for overdue bill checks, missing reading reminders, and lease expirations.  
- Note: Still deprioritized because on-demand notifications meet current needs.  
- Estimated: 2-3 hours (optional).

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

