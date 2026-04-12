# ManagePort Task Plan — 2026

## Milestone 1: Shippable Baseline (COMPLETED)
**Goal**: Clean production build, deployable app.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 1.1 | Fix `convex/dashboard.ts` optional propertyId narrowing in index callbacks | ✅ Done | `bun run build` passes |
| 1.2 | Fix `convex/dashboard.ts` type predicate (`Id<"units">` not `string`) | ✅ Done | `bun run build` passes |
| 1.3 | Refactor `activityLog.ts` — extract `logActivity` as plain helper function callable from other mutations | ✅ Done | `bun run build` passes |
| 1.4 | Refactor `notifications.ts` — extract `createNotification` as plain helper function | ✅ Done | `bun run build` passes |
| 1.5 | Fix `notifications.ts` — `q.and()` can't accept `undefined` arg | ✅ Done | `bun run build` passes |
| 1.6 | Fix `leases.ts` — unit field is `unitIdentifier`/`displayName`, not `name` | ✅ Done | `bun run build` passes |
| 1.7 | Type `testUtilityCharges.ts` arrays (`string[]` not `never[]`) | ✅ Done | `bun run build` passes |
| 1.8 | Replace all `ctx: any` in `utilityCharges.ts` with proper `MutationCtx` | ✅ Done | `bun run build` passes |
| 1.9 | Fix `utilityPayments.ts` — stop calling Convex mutations as functions, inline the DB patch | ✅ Done | `bun run build` passes |
| 1.10 | Fix 16+ frontend files using `getProperties` paginated result as flat array | ✅ Done | `bun run build` passes |
| 1.11 | Fix `wheel-wizard` missing `financialData` in WizardState | ✅ Done | `bun run build` passes |
| 1.12 | Fix missing `CalculatedTenantCharge` type export from `utilityCharges.ts` | ✅ Done | `bun run build` passes |
| 1.13 | Fix `OutstandingBalances.tsx` passing wrong args to `recordUtilityPayment` | ✅ Done | `bun run build` passes |
| 1.14 | Fix `utilityAnalytics.ts` early return missing `consistencyScore`, `highestMonth`, `lowestMonth` | ✅ Done | `bun run build` passes |
| 1.15 | Fix remaining type errors (predictions indexing, daysUntilExpiry narrowing, recommendations typing) | ✅ Done | `bun run build` passes |

**Verification**: `bun run build` completes with 0 type errors, 22 pages generated.

---

## Milestone 2: Persisted Utility Charge Pipeline
**Goal**: All billing reads from stored `utilityCharges` table. No more on-the-fly recalculation from bill totals × percentages.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 2.1 | Audit all places that compute charges from `bill.totalAmount * percentage` instead of reading `utilityCharges` table | ⏳ | Grep returns 0 results for `totalAmount * .*percent` in components |
| 2.2 | Rewrite `TenantStatementGenerator.tsx` (line 125) to read from stored charges via `calculateAllTenantCharges` query | ⏳ | Statement shows charge amounts matching `utilityCharges` records |
| 2.3 | Wire `utilityBills.ts` `addUtilityBill` mutation to auto-generate charges via `ensureChargesForBill()` | ⏳ | Adding a bill creates corresponding `utilityCharges` records |
| 2.4 | Wire `utilityBills.ts` `updateUtilityBill` to rebuild charges via `rebuildChargesForBill()` | ⏳ | Editing a bill amount updates `utilityCharges` records |
| 2.5 | Wire `utilityBills.ts` `deleteUtilityBill` to delete charges via `deleteChargesForBillInternal()` | ⏳ | Deleting a bill removes its `utilityCharges` records |
| 2.6 | Update `OutstandingBalances.tsx` to use stored charges exclusively (verify `calculateAllTenantCharges` query is sole data source) | ⏳ | Outstanding balances match `utilityCharges` + `utilityPayments` records |
| 2.7 | Remove deprecated functions from `utilityPayments.ts` that throw `"deprecated"` errors | ⏳ | No functions with `throw new Error("deprecated")` remain |
| 2.8 | Run `regenerateAllCharges` mutation on existing data to backfill stored charges | ⏳ | All non-historical bills have corresponding `utilityCharges` records |

**Verification**: 
- Create bill → charges appear in DB immediately
- Edit bill amount → charges update
- Delete bill → charges removed
- Tenant statement shows correct amounts from stored data
- Outstanding balances are accurate
- No code path computes charges from `bill.totalAmount * percentage` 

---

## Milestone 3: Utility Bills UX Simplification
**Goal**: The utility bills page is streamlined — quick add form, split views, URL-driven filters.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 3.1 | Create Quick Add utility bill form (4 required fields: property, type, amount, month) | ⏳ | Quick Add form visible, submits successfully with minimal input |
| 3.2 | Split utility bills page into tabs: "Bills" (list + quick add) and "Insights" (analytics) | ⏳ | Two tabs visible, each shows relevant content |
| 3.3 | Replace `useReducer`-based filtering in `useUtilityBillsData.ts` with URL search params | ⏳ | Filter state survives page refresh via URL params |
| 3.4 | Hide bulk operations and advanced tools behind "Advanced" toggle by default | ⏳ | Page loads with simplified view, advanced tools accessible via toggle |
| 3.5 | Ensure mobile layout works on iPhone 14 (390px) | ⏳ | Visual check at 390px viewport — no horizontal scroll, all controls accessible |

**Verification**:
- Add a bill in < 10 seconds via Quick Add
- Filters persist in URL (bookmarkable)
- Mobile usability confirmed

---

## Milestone 4: Dashboard Streamlining
**Goal**: Dashboard quick actions deep-link to dedicated pages instead of mounting heavyweight modals.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 4.1 | Replace "Add Property" quick action with link to `/properties?action=add` | ⏳ | Clicking quick action navigates to properties page with add modal |
| 4.2 | Replace "Add Bill" quick action with link to `/utility-bills?action=add` | ⏳ | Navigates to utility bills page with Quick Add focused |
| 4.3 | Replace "Add Lease" quick action with link to `/leases?action=add` | ⏳ | Navigates to leases page with add modal |
| 4.4 | Remove inline modal mounting from dashboard component | ⏳ | Dashboard component is lighter, no form imports |
| 4.5 | Add URL param handling on target pages to auto-open forms | ⏳ | `/properties?action=add` opens the add property wizard automatically |

**Verification**: 
- Dashboard loads faster (no form component imports)
- Quick actions navigate correctly
- Target pages auto-open the right form

---

## Milestone 5: Technical Debt Cleanup
**Goal**: Reduce linting warnings, remove dead code, improve type safety.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 5.1 | Run `bun run lint` and fix remaining warnings | ⏳ | `bun run lint` exits with 0 warnings |
| 5.2 | Remove `convex-test` route (dev-only, not needed) | ⏳ | Route removed, build still passes |
| 5.3 | Audit and remove unused imports across codebase | ⏳ | No unused import warnings |
| 5.4 | Remove remaining `any` types in Convex backend modules | ⏳ | `grep -r ": any" convex/` returns minimal results |
| 5.5 | Update `docs/CURRENT_STATUS.md` to match actual build/feature state | ⏳ | Docs accurately reflect what builds and what works |

**Verification**: `bun run lint` clean, `bun run build` clean, docs match reality.

---

## Milestone 6: De-scope Non-Core (Optional)
**Goal**: Isolate or remove features that don't serve the property management core.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 6.1 | Move `wheel-wizard` to a separate route group or remove entirely | ⏳ | Route removed or isolated under `/experiments/` |
| 6.2 | Comment out listing automation cron stubs until API credentials available | ⏳ | `convex/crons.ts` is clean (either empty or has working jobs) |
| 6.3 | Remove `page-original.tsx` backup files | ⏳ | No `-original` suffixed files exist |

---

## Priority Order

1. **Milestone 1** — ✅ COMPLETE — Build works
2. **Milestone 2** — NEXT — This is the core business logic fix
3. **Milestone 3** — After M2 — UX simplification on solid data foundation
4. **Milestone 4** — After M3 — Dashboard improvements
5. **Milestone 5** — Ongoing — Technical debt cleanup
6. **Milestone 6** — Optional — Scope management
