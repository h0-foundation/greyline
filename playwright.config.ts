import { defineConfig, devices } from "@playwright/test";
import { resolve } from "path";

const PORT = 3100;

// Drives the PRODUCTION standalone server against the canonical repo database
// (GREYLINE_DATA_DIR), so e2e exercises the same code path users run.
// Run `pnpm build` first (the `e2e` script does this).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // `next start` serves the client/static assets (the bare standalone server does
  // not), so client components hydrate during e2e. Runs from the repo root, so
  // the canonical data/ DB is used.
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      GREYLINE_DATA_DIR: resolve("data"),
    },
  },
});
