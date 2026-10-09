import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://localhost:4173",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    trace: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run preview -- --host localhost --port 4173",
    url: "http://localhost:4173/scanner.html",
    reuseExistingServer: false,
  },
});
