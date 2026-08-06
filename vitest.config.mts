import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

/**
 * Unit tests: pure functions, no network. Fast enough to run on every save.
 *
 * The integration tests under tests/integration talk to the real Convex
 * deployment and Clerk, so they live in vitest.integration.config.mts and run
 * separately — a missing credential or a flaky network should not read as a
 * broken build.
 *
 * Playwright owns the rest of tests/ and is excluded here.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
