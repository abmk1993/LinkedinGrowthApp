import { defineConfig, devices } from "@playwright/test";

// Override when 3000 is taken by something else — reuseExistingServer
// would otherwise run the suite against whatever is listening there.
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      // The dev server used in E2E runs against a mocked AI provider —
      // set via this flag, checked in lib/ai/getProvider.ts.
      USE_MOCK_AI_PROVIDER: "true",
    },
  },
});
