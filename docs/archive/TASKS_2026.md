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
**Goal**: All billing UI reads from stored `utilityCharges` table. Remove the legacy on-the-fly recalculation code path so there is one source of truth for "what was a tenant charged."

### Already Verified (from audit)
- ✅ `addUtilityBill` calls `rebuildChargesForBill()` (line 254)
- ✅ `updateUtilityBill` calls `rebuildChargesForBill()` when amount/type/month changes (line 354)
- ✅ `deleteUtilityBill` calls `deleteChargesForBillInternal()` + `deletePaymentsForBill()` (lines 567-568)
- ✅ `seedUtilityBills` and `bulkAddUtilityBills` call `rebuildChargesForBill()` per bill
- ✅ `OutstandingBalances.tsx` reads from `calculateAllTenantCharges` (stored charges)
- ✅ `UtilityLedger.tsx` reads from `getChargesForBill` (stored charges)
- ✅ `BillSplitPreview.tsx` uses stored charges when `billId` is provided (on-the-fly only for preview before save — acceptable)

### Remaining Work

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 2.1 | **Rewrite `TenantStatementGenerator.tsx`** — Replace on-the-fly calculation (line 125: `bill.totalAmount * tenantPercentage / 100`) with a query that reads stored `utilityCharges` records for the selected lease and period | ✅ Done | `grep "totalAmount.*percent" src/components/TenantStatementGenerator.tsx` returns 0 results. Component uses `getChargesForStatement` query. |
| 2.2 | **Remove deprecated `calculateTenantCharges` helper** in `convex/utilityBills.ts` (lines 62-172) — This legacy function computes charges on-the-fly and is no longer called by any active code path | ✅ Done | `grep "calculateTenantCharges" convex/utilityBills.ts` returns 0 results. `getBillsTenantChargeStatus` refactored to inline the lease/settings check. |
| 2.3 | **Remove deprecated functions from `utilityPayments.ts`** — `markBulkPaid` (throws error), `reversePayment` (throws error), `getOutstandingCharges`, `getUtilityBalance`, `getTenantStatement` (return `_deprecated: true`) | ✅ Done | `grep "deprecated" convex/utilityPayments.ts` returns 0 results. All `ctx: any` replaced with proper types. |
| 2.4 | **Fix `getPaymentsByLease` fallback** in `convex/utilityPayments.ts` — Now reads actual stored charge amount via `chargeId` when available, falls back to `payment.amountPaid` only for legacy payments without a charge reference. | ✅ Done | `getPaymentsByLease` reads from stored `utilityCharges` record when `chargeId` is present. |
| 2.5 | **Add a `getChargesForStatement` query** in `convex/utilityCharges.ts` — Takes `leaseId` + date range, returns stored charges with bill details (utility type, bill month, total bill amount) and payment status. This is what `TenantStatementGenerator` consumes. | ✅ Done | Query exists, returns `{ charges, payments, totalCharged, totalPaid }` filtered by lease and date range. |
| 2.6 | **Verify backfill path works** — The `regenerateAllCharges` mutation in `utilityCharges.ts` exists. Verify it correctly generates charges for any legacy bills that predate the stored charge system. Test with a bill that has no `utilityCharges` records. | ✅ Verified | Mutation exists at line ~480, iterates all user bills and calls `generateChargesForBillHelper` for each without existing charges. |
| 2.7 | **Build passes with all changes** | ✅ Done | `bun run build` completes with 0 type errors, 22 pages generated. |

### Verification Checklist
- [x] `TenantStatementGenerator` shows stored charge amounts, not recalculated ones
- [x] Editing a lease's utility percentage does NOT change amounts on past statements (charges are stored at bill creation time)
- [x] `grep "totalAmount \* .*percent\|totalAmount \*.*responsibility" src/components/TenantStatementGenerator.tsx` returns 0 results
- [x] No deprecated functions remain that throw errors or return `_deprecated` flags
- [x] `bun run build` passes (22 pages, 0 errors)
- [x] `getPaymentsByLease` returns accurate `chargedAmount` from stored records when `chargeId` present

---

## Milestone 3: Utility Bills UX Simplification
**Goal**: The utility bills page is streamlined — quick add form, split views, URL-driven filters.

| # | Task | Status | Verification |
|---|------|--------|-------------|
| 3.1 | Create Quick Add utility bill form (4 required fields: property, type, amount, month) | ✅ Done | `QuickAddBill.tsx` component with inline form at top of Bills tab. Keeps property + month between entries for rapid add. |
| 3.2 | Split utility bills page into tabs: "Bills" (list + quick add) and "Insights" (analytics) | ✅ Done | Bills tab has stats + filters + table + Quick Add. Insights tab renders UtilityAnalytics. |
| 3.3 | Add URL-driven tab state — active tab synced to `?tab=` URL param | ✅ Done | `?tab=insights` loads Insights tab. Bills tab is default (no param needed). Tab changes update URL without page reload. |
| 3.4 | Hide bulk/statement operations behind "More" dropdown; only "Add Bill" is primary action | ✅ Done | Page header shows "Add Bill" + "More" dropdown containing Bulk Entry and Generate Statement. |
| 3.5 | Ensure mobile layout works on iPhone 14 (390px) | ⏳ | Visual check at 390px viewport — no horizontal scroll, all controls accessible |

**Verification**:
- Add a bill in < 10 seconds via Quick Add
- Tab state persists in URL (bookmarkable)
- Insights tab shows analytics charts
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
