import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  // The authenticated fixture intentionally shares one isolated PostgreSQL tenant across the persisted workflow tests.
  // Serial execution prevents concurrent status mutations and connection/port contention; assertions remain unchanged.
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
