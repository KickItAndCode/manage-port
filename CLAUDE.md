# Claude Project Guidelines

## Memory
- Don't take credit for commit descriptions. Just make a detailed summary of the changes

## What this project is

A property management app for landlords: properties and units, leases and
tenants, utility bills split across tenants, payments, and documents.

It depends on **Convex and Clerk only**. There is no listing, email or SMS
integration, and none is required to run it. A listing integration to
Apartments.com/Zillow existed and was removed in August 2026 — it had never
executed, and two of its three platform keys had no adapter behind them. Don't
resurrect it from git history without real credentials to test against.

For current state, see `docs/CURRENT_STATUS.md`. For what shipped when, see
`CHANGELOG.md`.

## Commands

```bash
bun run dev               # dev server
bun run build             # production build — lint runs, errors block

bun run test              # unit (vitest), offline, ~200ms
bun run test:integration  # Convex + Clerk contract; skips without credentials
bun run test:e2e          # Playwright, chromium + mobile

npx tsc --noEmit          # typecheck
npx convex dev --once     # push Convex functions and schema
```

`bun run test:e2e` manages its own dev server. If one is already listening on
port 3000 it will not reuse it reliably — stop yours first.

## Conventions that matter here

**Derive, don't store.** Lease status, unit occupancy and property occupancy
are computed from dates and live leases, never read from a stored column. Seven
separate bugs came from stored copies drifting: a property page once showed "2
active leases · 100% Occupancy · Current Tenant" for leases that had ended eight
months earlier. `leases.status` remains as a deprecated optional column that
nothing reads, and its `by_status` index was deleted so reaching for it is a
compile error. Use `convex/lib/leaseStatus.ts`, which both runtimes share.

**Dates are calendar days, not instants.** `new Date("2026-08-06")` parses as
UTC midnight and renders as the 5th anywhere west of Greenwich. Compare
`YYYY-MM-DD` strings, or use `toLocalDate`/`daysUntil` in
`src/utils/utilityBillHelpers.ts`. This produced off-by-one bugs five times.

**Money is allocated in integer cents.** `convex/lib/money.ts` `allocateCents`
splits a bill so the parts always sum to the whole. Never compute a share as
`total * pct / 100` in floating point.

**Authorization comes from the token, never from arguments.** Convex functions
are public HTTP endpoints. Every handler derives the caller via `requireUser` or
one of the ownership helpers in `convex/lib/auth.ts`. Never add a `userId`
argument to a public function — the app previously trusted one and any caller
could read anyone's data. Functions that should not be client-callable are
`internalQuery`/`internalMutation`.

**Typecheck does not catch stale Convex arguments in variables.** TypeScript's
excess-property check only fires on inline object literals. Args built in a
`useMemo` or typed `any` pass structurally and fail at runtime. Three pages
shipped dead behind the error boundary this way while the build was green.

## Testing

Three layers, organised around the failures this codebase actually had rather
than generic CRUD. See `tests/README.md`.

- `tests/integration/` — authorization and write-flow contracts against the real
  Convex deployment
- `tests/routes.spec.ts` — every route mounts with no error boundary and no
  console errors, and redirects signed-out visitors
- `tests/consistency.spec.ts` — views compared against each other, guarding the
  derive-don't-store rule
- `tests/hydration.spec.ts` — server/client render agreement
- `tests/forms.spec.ts` — real browser events, since setting a `<select>` value
  programmatically does not fire React's `onChange`

Authentication mints a Clerk sign-in ticket via the Backend API rather than
filling the sign-in form. The ticket must be a **query parameter** — in the URL
fragment it never reaches Clerk.

Interactive elements need `data-testid`. Prefer role-based selectors; both
desktop and mobile layouts render simultaneously with one hidden by CSS, so
scope to `.locator("visible=true")` when both match.

## Project structure

```
src/app/          Next.js routes
src/components/   React components
src/lib/          shared helpers (auth, csv, lease-status, money)
src/middleware.ts CSP, security headers, route protection
                  — must live under src/, not the repo root, or it never runs
convex/           backend functions, schema, crons
convex/lib/       shared logic used by both runtimes
tests/            unit, integration and Playwright suites
docs/             CURRENT_STATUS.md is the live one; archive/ is history
```

## Known gaps

- Clerk is a development instance. Production needs its own instance, `convex`
  JWT template, and `CLERK_JWT_ISSUER_DOMAIN` on the prod deployment.
- No CI workflow yet.
- Property wizard, document upload, payment recording and statement generation
  have covered mutations but unverified forms.
- `units`, `utilityCharges`, `leaseUtilitySettings` and `utilityPayments` have
  no `userId` column; ownership is reached through joins.
