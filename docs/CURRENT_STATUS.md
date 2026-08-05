# Current Status — ManagePort

**Last Updated**: August 4, 2026

This is the single status document. Anything under `docs/archive/` is a
historical record of a finished phase and is not maintained.

---

## Where the project stands

The application builds clean, typechecks clean outside `tests/`, and lints
clean. Every Convex function derives the caller's identity from a verified
Clerk JWT. Two data-correctness bugs in the billing path have been fixed.

| Check | State |
|---|---|
| Production build | passes, 19 routes |
| `npx tsc --noEmit` | clean in `src/` and `convex/`; 10 errors remain in `tests/` |
| `bun run lint` | 0 errors, ~296 `any` warnings |
| `bun run test` (unit) | 24 passing |
| Cross-tenant isolation suite | 28 checks passing |
| Public Convex handlers | 146, all authorization-guarded |
| First Load JS (shared) | 102 kB |

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
- All 146 public handlers converted. Tables without their own `userId`
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

## Known gaps

**Before public beta**

- Clerk is on a development instance (`pk_test`). Production needs its own
  Clerk instance, its own `convex` JWT template, and `CLERK_JWT_ISSUER_DOMAIN`
  set on the production Convex deployment
- `tests/` has 10 typecheck errors and the Playwright suite has drifted from
  the app; it needs live Clerk credentials to run

**Known debt, not blocking**

- `units`, `utilityCharges`, `leaseUtilitySettings` and `utilityPayments` have
  no `userId` column, so ownership is reached through joins. Adding it would
  simplify authorization and remove several full-table scans in `admin.ts`
- Rate limiting in `properties.ts` uses an in-memory `Map`, which does not
  survive across serverless instances
- `leases.status` is retained as an optional deprecated column. Dropping it
  needs a data migration
- ~296 `no-explicit-any` warnings
- `convex/utilityBills.ts` is ~1,380 lines; `properties/[id]/page.tsx` ~1,300
- The listing integration is built but inert, pending platform API credentials
- The deployment has five tables absent from `schema.ts` (`jobQueue`,
  `jobLogs`, `cronJobs`, `tenantUtilityCharges`, `unitUtilityResponsibilities`)

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
