import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  workers: 1,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://localhost:4173",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    trace: process.env.CI ? "retain-on-failure" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
  },
  webServer: {
    command: "npm run preview -- --host localhost --port 4173",
    url: "http://localhost:4173/scanner.html",
    reuseExistingServer: false,
  },
});
