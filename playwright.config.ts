import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  // The authenticated fixture intentionally shares one isolated PostgreSQL tenant across the persisted workflow tests.
  // Serial execution prevents concurrent status mutations and connection/port contention; assertions remain unchanged.
  workers: 1,
  use: { baseURL: "http://localhost:3002", trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/start-e2e.cjs",
    url: "http://localhost:3002/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
