import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

/**
 * Integration tests against the real Convex deployment, authenticated as real
 * Clerk users. They need CLERK_SECRET_KEY and NEXT_PUBLIC_CONVEX_URL; without
 * those the suites skip themselves rather than fail.
 *
 * Run serially: several tests create and delete records on a shared deployment,
 * and running them in parallel would let one suite observe another's fixtures.
 */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 90_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
