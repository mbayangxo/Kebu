import { defineConfig, devices } from "playwright/test";

const baseURL = process.env.KEBU_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // Local suites require dedicated fixture servers/SQL authorities and run via
  // scripts/verify-*-local-ui.mjs. Never discover them against a hosted preview.
  testIgnore: "**/*.local.spec.ts",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    extraHTTPHeaders: protectionBypass
      ? {
          "x-vercel-protection-bypass": protectionBypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
    // Session/protection headers must not be persisted in trace archives.
    trace: protectionBypass || process.env.KEBU_E2E_BUILDER_COOKIE ? "off" : "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
