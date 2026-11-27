import { defineConfig } from "@playwright/test";

// End-to-end tests run against a production build in local-only mode
// (no Supabase env vars), so they need no network or test account.
// CHROME_PATH lets them use an installed Chrome instead of `npx playwright install`.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3123",
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: "npx next start -p 3123",
    url: "http://localhost:3123",
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
  },
});
