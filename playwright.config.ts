import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.KEBU_E2E_BASE_URL ?? "https://localhost:3000";

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
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
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
