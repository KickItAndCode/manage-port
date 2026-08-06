# Changelog

## 2026-08-06

A single body of work merged as `e6db53c`, revertable as a unit with
`git revert -m 1 e6db53c`.

### Security

- **Authorization now derives from the verified Clerk JWT.** Convex functions
  are public HTTP endpoints, and they accepted `userId` as a client argument and
  trusted it — any caller could read or modify another user's data by passing a
  different Clerk ID. Convex received no token at all: the app used
  `ConvexProvider` rather than `ConvexProviderWithClerk` and had no
  `auth.config.ts`, so `ctx.auth.getUserIdentity()` always returned null and the
  handful of functions that *did* check identity failed on every call. All 131
  public handlers converted. No data migration was needed — the JWT `sub` claim
  is the value already stored in `userId`.
- **`listingJobs.getPlatformTokens` was a public query returning OAuth access
  and refresh tokens.** Made internal, then removed with the feature.
- **`storage.getUrl` and `storage.deleteFile` were unauthenticated.** A storage
  ID is not secret — it sits on every document row — so anyone holding one could
  download another user's lease or tax document, or delete it. Both now confirm
  the caller owns a record referencing the ID.
- **`admin.clearAllData` deleted an entire account, guarded only by a hardcoded
  string.** Now scoped to the signed-in user.
- **Middleware had never run.** It sat at the repo root; with a `src/` directory
  Next.js looks for `src/middleware.ts`. No CSP, no HSTS, no `X-Frame-Options`,
  and no route protection — signed-out visitors reached protected pages and sat
  on an endless loading skeleton instead of being redirected. Added `worker-src`
  so Clerk's blob worker is not refused once the policy started applying.

### Fixed

- **Lease status never recomputed.** Written once at create/update; the
  reconciler had no callers and `crons.ts` was empty. All seven leases on the
  deployment read `"active"` while all seven had ended — every one still
  generating tenant utility charges and inflating reported income. Status now
  derives from dates through one module both runtimes share. The same drift was
  found and fixed in seven separate places, including `getActiveLeases`, which
  indexed the deprecated column; that index has been deleted.
- **Property and unit occupancy** derived from live leases rather than stored
  status. "Maintenance" and "Under Contract" are preserved — they record a
  decision, not a consequence of a lease.
- **Bill splitting rounded inconsistently.** The preview rounded to cents while
  the persisted path stored raw floats, so the figure a landlord approved was
  not the figure recorded. Both now use one integer-cent allocator; the parts
  always sum to the whole.
- **Dates displayed a day early.** `new Date("2026-08-06")` parses as UTC
  midnight and renders as the 5th in any negative-offset timezone. Affected
  every due date, "expires in N days", and the 60-day renewal threshold.
- **Three pages crashed** — `/utility-bills`, `/documents` and the document edit
  form sent a stale `userId`. Typecheck could not catch it: its excess-property
  check only fires on inline object literals, and all three built arguments in a
  variable.
- **Two React hooks were called after an early return**, in `DocumentViewer` and
  `LeaseForm`.
- **Hydration mismatch on every signed-in page load.** `ConditionalLayout` chose
  its layout from `useUser()`, which cannot resolve during SSR, so server and
  client rendered different trees and React discarded the server render.
- **The dashboard claimed the account had no bills** while the bills page listed
  33 totalling $6,157.86 — the chart treated an empty timeframe as an empty
  account.
- **`sortLeasesByStatus` sorted expired leases oldest-first**, contradicting its
  own comment.

### Added

- **CSV export** for properties, leases and utility bills. RFC 4180 quoting
  (addresses contain commas), formula-injection neutralisation, UTF-8 BOM.
- **Daily notifications.** Two generators for expiring leases and overdue bills
  already existed with no callers because `crons.ts` was empty; the settings
  page, bell menu and notifications table had never produced an alert. Now
  scheduled.
- **A test suite** built around the failures above rather than generic CRUD: 34
  unit, 14 integration against the real deployment, 41 browser tests across
  desktop and mobile. Authentication uses a Clerk sign-in ticket rather than
  filling the sign-in form — 4.8s instead of ~30s, and no password.

### Removed

- **The listing integration** — 4,865 lines that had never executed once,
  written against an assumed `api.apartments.com` contract. Two of its three
  platform keys had no adapter behind them at all.
- **6,591 lines of unreachable code**, including a Wheel-strategy
  options-trading feature, a five-component utility-responsibility graveyard,
  and three scratch routes that shipped in the production bundle.
- **~6,000 lines of drifted Playwright specs** written against earlier UI and
  excluded from every run.

### Changed

- **First Load JS cut from 599 kB to 102 kB.** A custom `splitChunks` config
  collapsed every module shared by two routes into one chunk loaded on every
  page, undoing Next's per-route chunking.
- **`eslint.ignoreDuringBuilds` removed** — it was hiding 154 errors.
- Settings no longer offers Email and Push toggles with no provider behind them.
- "Portfolio Value" relabelled "Annualised Rent"; Utility Anomalies no longer
  reports "all normal" from an empty set; former tenants are marked in
  outstanding balances.
- One lockfile (`bun.lock`); `puppeteer` moved to `devDependencies`.
