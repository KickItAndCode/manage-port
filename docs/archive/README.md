# Archive

Historical documents. **Nothing here is maintained, and nothing here should be
read as a description of how the system currently works.**

Much of it was accurate when written and is now wrong — features described as
shipped have since been deleted, and status documents describe phases that
ended. It is kept because the reasoning behind a decision is often worth more
later than the decision itself.

The only maintained status document is [`../CURRENT_STATUS.md`](../CURRENT_STATUS.md).

---

## Why each was archived

### Task lists and status narratives

Superseded by `CURRENT_STATUS.md`. All of these track a phase plan that has
since ended, and each declares a "current" focus that is years stale.

| File | Why |
|---|---|
| `TASKS.md` | Nov 2025 task list. Its top priority — persisting utility charges — shipped. |
| `TASKS_2026.md` | Apr 2026 list. Milestone 1 complete; of its 14 open items, the still-open ones were carried into `CURRENT_STATUS.md` before archiving (see below). |
| `QUICK_START.md` | Dated Jan 2025, opened with "Current Focus: Phase 3". |
| `IMPLEMENTATION_TASKS.md`, `NEXT_PHASE_PLAN.md`, `PHASE_*.md` | The phase plan itself, start to finish. |
| `PROJECT_SUMMARY.md`, `IMPLEMENTATION_SUMMARY.md`, `legacy_planning_archive.md` | Earlier summaries of the same. |
| `COMPREHENSIVE_UX_IMPROVEMENT_PLAN.md`, `FLUENCY_IMPLEMENTATION_GUIDE.md` | Aspirational UX roadmap from the former `/tasks` directory, never scheduled. |

### Completed work, written up after the fact

Accurate as history. They describe finished changes, not pending ones.

| File | Why |
|---|---|
| `UNIFIED_PAYMENT_SYSTEM_IMPLEMENTATION.md` | The payment unification it describes shipped. |
| `UTILITY_BILLS_SOLUTION.md` | The `noTenantCharges` flag for historical bills shipped. |
| `UTILITY_BILLS_REFACTOR_PLAN.md` | Its central finding — an N+1 in `calculateChargesForBill` — is obsolete; that function no longer exists. |
| `PRD_Multi_Tenant_Utility_Management.md` | The multi-unit and bill-splitting PRD, shipped. Opens by describing single-family-only support, which stopped being true when it was built. |
| `BUN_MIGRATION.md` | The npm → bun migration, done. |
| `CLERK_CATCH_ALL_FIX.md` | A June 2025 routing fix. Authentication was rewritten wholesale in Aug 2026, so this describes code that no longer exists. |
| `MOBILE_RESPONSIVE_TABLE_SYSTEM_ANALYSIS.md`, `RESPONSIVE_TABLE_TECHNICAL_SPEC.md`, `MOBILE_RESPONSIVE_TABLE_IMPLEMENTATION_SUMMARY.md` | Analysis, spec and write-up for the responsive table work, shipped. |
| `PLAYWRIGHT_EVALUATION.md`, `PLAYWRIGHT_IMPLEMENTATION_SUMMARY.md`, `PLAYWRIGHT_NEXT_STEPS.md` | Written against the pre-Aug-2026 Playwright suite, which was removed and rebuilt. |

### Plans for the deleted listing integration

The listing integration — publishing to Apartments.com, Zillow and a syndication
service — was removed in Aug 2026 as 4,865 lines that had never executed. These
are the documents that planned it, kept for the reasoning rather than the plan.

| File | Why |
|---|---|
| `real-estate-listing-integration.md` | The original 780-line design. |
| `listing-integration-final-implementation-plan.md`, `listing-integration-execution-breakdown.md`, `simplified-listing-integration-plan.md` | Three successive re-plans of the same feature. |
| `platform-partnership-research.md` | Research into platform API access, which was never granted. |
| `universal-image-optimization-strategy.md` | Image pipeline sized for Zillow and Apartments.com upload limits; the platforms it targets are gone. |

### Shipped from `future-features`

| File | Why |
|---|---|
| `utility-charge-auto-generation.md` | The persisted utility-charge pipeline, shipped in `e07797d`. |

### Drifted references

| File | Why |
|---|---|
| `COMPONENT_INVENTORY.md` | Two of the ten components it inventories no longer exist. |
| `FORM_DESIGN_SYSTEM_AUDIT.md` | Its finding still holds, so it was carried into `CURRENT_STATUS.md` rather than lost — see below. |
| `BUN_COMMANDS.md` | A general bun cheat-sheet duplicating bun's own docs, with a duplicated header and lingering npm examples. Project commands live in `CURRENT_STATUS.md`. |
| `UTILITY_CHARGE_ROLLBACK_PROCEDURES.md` | An emergency runbook for a rollout that completed. Its steps reference `npm run build` and a "fresh database start" that no longer applies. |
| `STORYBOOK_SETUP.md` | Setup guide for Storybook, which is not installed — no `.storybook/` directory and no dependency in `package.json`. |

The rest of `docs/ui/` was **not** archived: all 11 components it documents
exist, so it remains the live reference for `src/components/ui/`.

---

## What was carried forward, not buried

Archiving a document should not silently drop work that is still open. These
were verified as still true at the time of archiving and moved into
`CURRENT_STATUS.md`:

- **Dashboard quick actions still mount forms inline** (`TASKS_2026` items
  4.1–4.5). `src/app/dashboard/page.tsx` imports `LeaseForm`,
  `UtilityBillForm` and the property wizard directly.
- **`: any` remains throughout the Convex backend** (`TASKS_2026` item 5.4).
- **Form controls are split between raw `<select>` and `SelectNative`**, and
  `src/styles/tokens.ts` is imported by nothing
  (`FORM_DESIGN_SYSTEM_AUDIT`).

Items verified as **done** and therefore not carried: the `convex-test` route,
the `wheel-wizard` route, `-original` backup files, and the empty `crons.ts` —
all removed or fixed in Aug 2026.
