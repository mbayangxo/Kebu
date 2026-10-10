/**
 * Phase 3B Gate 2 — authenticated Builder E2E against a LOCAL app backed by the
 * QA Supabase project only. Imports from "playwright/test" (installed) because
 * @playwright/test is declared in package.json but absent from the lockfile at
 * 75c0343 (recorded Gate 2 finding).
 */
import { defineConfig } from "playwright/test";

const secrets = [
  process.env.SUPABASE_QA_SERVICE_ROLE_KEY,
  process.env.SUPABASE_QA_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
].filter((v): v is string => typeof v === "string" && v.length > 10);

export default defineConfig({
  testDir: ".",
  // Not *.spec.ts: keeps this QA-only harness out of the default `playwright test` / CI e2e job.
  testMatch: "*.gate2.e2e.ts",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: process.env.GATE2_OUTPUT_DIR ?? "./.gate2-results",
  use: {
    baseURL: process.env.KEBU_E2E_BASE_URL,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH },
    ...(secrets.length ? { secrets } : {}),
  },
});
