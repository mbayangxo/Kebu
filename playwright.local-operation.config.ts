import { defineConfig } from "@playwright/test";

/** Supplemental local UI wiring tests with a controlled authority; never a replacement for QA. */
export default defineConfig({
  testDir: "./tests/creative-core", testMatch: "builder-operation-ui.local.spec.ts",
  timeout: 90_000, workers: 1, retries: 0, reporter: "list",
  use: {
    baseURL: "http://localhost:3010", viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"] },
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3010",
    url: "http://localhost:3010", timeout: 180_000, reuseExistingServer: false,
    env: { KEBU_KCD_RENDER: "all", KEBU_KCD_OPERATIONS: "all", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
  },
});
