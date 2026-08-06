# Tests

Three layers, each guarding a way this application has actually broken.

```bash
bun run test              # unit — pure functions, offline, ~200ms
bun run test:integration  # Convex + Clerk contract, ~12s
bun run test:e2e          # Playwright, ~50s
```

## Layers

**Unit** (`src/**/*.test.ts`, `convex/**/*.test.ts`) — pure functions only, no
network. `convex/lib/money.test.ts` covers the cent allocator across 80
total/split combinations, asserting no money is lost or invented.

**Integration** (`tests/integration/`) — calls the real Convex deployment as
real Clerk users.

- `authorization.test.ts` — cross-tenant reads and writes, anonymous access,
  spoofed `userId` arguments, and internal endpoints staying off the public API.
  Convex functions are public HTTP endpoints; the app once accepted `userId` as
  a client argument and trusted it.
- `writeFlows.test.ts` — create/update/delete for bills and leases, bill
  splitting, and occupancy derived in both directions.

Needs `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CONVEX_URL`. Without them the suites
skip rather than fail, so a missing key does not read as broken code.

**End-to-end** (`tests/*.spec.ts`)

- `routes.spec.ts` — every route mounts with no error boundary and no console
  errors, and redirects signed-out visitors. Three pages once shipped dead
  behind the error boundary while typecheck, lint and the build were green.
- `consistency.spec.ts` — views compared against each other, not against fixed
  values. Occupancy drifted between the dashboard, the property list and
  property detail; it was fixed four times and the next view was still wrong.
- `hydration.spec.ts` — seeds the client-only state that provokes a server/client
  mismatch.
- `forms.spec.ts` — drives real controls. Setting a `<select>` value
  programmatically does not fire React's `onChange`, so a form can look filled
  while its state is empty.

## Authentication

`auth.setup.ts` mints a single-use Clerk sign-in ticket through the Backend API
and passes it to `/sign-in`, rather than filling the sign-in form. About 4.8s
instead of ~30s, no password, and no coupling to Clerk's markup.

The ticket must be a **query parameter**. In the URL fragment it never reaches
Clerk and the exchange silently does nothing.

## Fixtures

Records created by tests are removed in `global-teardown.ts` through Convex
rather than by driving the delete UI, which depends on a menu, a dialog, and the
page still being open. Leftovers from a crashed run are identifiable by a
distinctive amount in a far-future month.
