# Current Status — ManagePort

**Last Updated**: August 6, 2026

This is the single status document. Anything under
[`docs/archive/`](archive/README.md) is a historical record — accurate when
written, unmaintained since, and in places describing features that have since
been deleted. `docs/PRDMobile.md` is a forward-looking proposal, not a
description of what exists.

---

## Where the project stands

Everything runs on Convex and Clerk. No other external service is required.

| Check | State |
|---|---|
| Production build | passes, 14 routes |
| `npx tsc --noEmit` | 0 errors, repo-wide including `tests/` |
| `bun run lint` | 0 errors |
| `bun run test` (unit) | 34 passing |
| `bun run test:integration` | 14 passing |
| `bun run test:e2e` | 41 passing |
| Public Convex handlers | 131, all authorization-guarded |
| First Load JS (shared) | 102 kB |
| `src` + `convex` | 41,942 lines |

---

## Recently completed

### Authorization (was the blocker for any external user)

Convex functions are public HTTP endpoints. They previously accepted `userId`
as a client argument and trusted it, so any caller could read or modify another
user's data by passing a different Clerk ID. Convex received no auth token at
all: the app used `ConvexProvider` rather than `ConvexProviderWithClerk`, and
no `auth.config.ts` existed, so `ctx.auth.getUserIdentity()` always returned
null — which also meant the handful of functions that *did* check it failed on
every call.

- `convex/auth.config.ts` points at the Clerk Frontend API URL via the
  `CLERK_JWT_ISSUER_DOMAIN` deployment variable
- `convex/lib/auth.ts` provides `requireUser`, `getUserOrNull`, `requireOwned`,
  `requirePropertyOwner`, `requireBillOwner`, `requireLeaseOwner`,
  `requireChargeOwner`. Unauthorized and missing both report `NOT_FOUND` so IDs
  cannot be probed
- All 131 public handlers converted. Tables without their own `userId`
  (`units`, `utilityCharges`, `leaseUtilitySettings`, `utilityPayments`) reach
  ownership through the parent property, bill or lease
- Maintenance and background-job functions became `internalQuery`/
  `internalMutation`, removing them from the public API — including
  `listingJobs.getPlatformTokens`, which returned OAuth access and refresh
  tokens
- `storage.getUrl` and `storage.deleteFile` were completely open; a storage ID
  is not secret, so anyone holding one could download another user's lease or
  tax document, or delete it

No data migration was needed: the Clerk JWT `sub` claim is the same value
already stored in `userId`.

### Lease status

`lease.status` was written once at create/update and never recomputed. The
reconciler that existed had no callers and `crons.ts` is empty, so the column
drifted while the UI computed status from dates — meaning display and billing
disagreed. On the dev deployment all 7 leases read `"active"` while all 7 had
ended; every one was still generating tenant utility charges.

Status now derives from dates everywhere via `convex/lib/leaseStatus.ts`, which
`src/lib/lease-status.ts` re-exports so the two runtimes cannot diverge.
Comparisons use `YYYY-MM-DD` strings in UTC rather than `Date` + `setHours`,
which resolved in local time and could put the browser and the server on
different days.

### Charge rounding

The split preview rounded to cents; the code that persisted charges stored raw
floats. The amount a landlord approved was not the amount recorded. Rounding
each share independently also lost pennies. Both paths now use
`convex/lib/money.ts` `allocateCents`, which works in integer cents and
distributes the remainder by largest fractional part, so the parts always sum
to the whole.

### Cleanup

- 6,591 lines of unreachable code removed, including a Wheel-strategy
  options-trading feature, a five-component utility-responsibility graveyard,
  and three scratch routes that shipped in the production bundle
- First Load JS cut from 599 kB to 102 kB by removing a custom `splitChunks`
  config that forced every shared module onto every page
- `eslint.ignoreDuringBuilds` removed; the 154 errors it was hiding are fixed,
  including two `rules-of-hooks` violations
- `vitest` added. `src/lib/__tests__/lease-status.test.ts` had existed all
  along but imported `@jest/globals`, which was never installed, so it had
  never run

---

## Scope decision: no external APIs

The listing integration — publishing to Apartments.com, Zillow and a syndication
service — was removed rather than carried as dead weight. It was 4,865 lines
that had never executed once, written against an assumed API contract, and two
of its three platform keys had no adapter behind them at all. It gated a beta on
a 2–3 week credential approval for a feature nobody could use meanwhile.

Everything the app does now runs on Convex and Clerk alone. What replaced that
surface costs nothing to operate:

- **Daily notifications.** Two generators for expiring leases and overdue bills
  already existed with no callers, because `crons.ts` was empty. They are now
  scheduled, so the notification centre finally produces alerts.
- **CSV export** for properties, leases and bills. Getting the data out for an
  accountant or a backup matters as much as getting it in, and there was no
  export of any kind.

Email and SMS delivery are not built — no provider is wired. Settings says so
plainly rather than offering toggles that control nothing.

## Known gaps

**Before public beta**

- Clerk is on a development instance (`pk_test`). Production needs its own
  Clerk instance, its own `convex` JWT template, and `CLERK_JWT_ISSUER_DOMAIN`
  set on the production Convex deployment
- The Playwright and integration suites need Clerk credentials; they skip
  rather than fail without them

**Known debt, not blocking**

- `units`, `utilityCharges`, `leaseUtilitySettings` and `utilityPayments` have
  no `userId` column, so ownership is reached through joins. Adding it would
  simplify authorization and remove several full-table scans in `admin.ts`
- Rate limiting in `properties.ts` uses an in-memory `Map`, which does not
  survive across serverless instances
- `leases.status` is retained as an optional deprecated column. Dropping it
  needs a data migration
- `convex/utilityBills.ts` is ~1,380 lines; `properties/[id]/page.tsx` ~1,300
- ~296 `no-explicit-any` warnings remain (warnings, not errors)

- The deployment has tables absent from `schema.ts` left by earlier iterations
  (`jobQueue`, `jobLogs`, `tenantUtilityCharges`, `unitUtilityResponsibilities`)

**Carried over from retired task lists**

These outlived the documents that tracked them. Each was re-verified as still
open when `docs/archive/` was consolidated; the rest of those lists had been
completed.

- The dashboard mounts `LeaseForm`, `UtilityBillForm` and the property wizard
  inline. Linking to `/properties?action=add` and friends would drop three form
  imports from the heaviest page, but no page reads an `action` parameter yet
- `: any` appears ~70 times across the Convex backend
- Form controls are split between raw `<select>` (11 files) and `SelectNative`
  (9 files). `src/styles/tokens.ts` is imported by nothing — either adopt it or
  delete it

---

## Commands

```bash
bun run dev        # dev server
bun run build      # production build (lint runs, errors block)
bun run lint       # eslint
bun run test       # vitest unit tests
bun run test:e2e   # playwright
npx convex dev     # push Convex functions
```
