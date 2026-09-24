import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.KEBU_E2E_BASE_URL ?? "https://localhost:3000";

// Values listed in `secrets` are redacted in Playwright trace files and
// Playwright Test reporter output. Add any credential that must not appear
// in a recorded trace or CI log. Values are replaced with "<secret>".
const playwrightSecrets: string[] = [
  process.env.SUPABASE_QA_SERVICE_ROLE_KEY,
  process.env.SUPABASE_QA_ANON_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.KEBU_E2E_BUILDER_COOKIE,
  process.env.SUPABASE_QA_DB_URL,       // contains DB password in connection string
].filter((v): v is string => typeof v === "string" && v.length > 10);

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    // Traces are written on first retry only.
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    // Redact credential values from traces (Playwright 1.41+).
    // Listed strings are replaced with "<secret>" wherever they appear in
    // recorded network traffic, localStorage snapshots, and console messages.
    ...(playwrightSecrets.length > 0 ? { secrets: playwrightSecrets } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use the pre-installed Chromium in the CCR environment
        launchOptions: {
          executablePath:
            process.env.CHROMIUM_EXECUTABLE_PATH ??
            "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
        },
      },
    },
  ],
});
