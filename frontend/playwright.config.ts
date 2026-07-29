import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const API_PORT = process.env.E2E_API_PORT ?? "4100";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3100";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/intel_threat_modeller";

// This sandbox pre-installs Chromium at a fixed path instead of via `playwright install`;
// everywhere else (CI, a developer's machine) falls back to Playwright's own resolution.
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const executablePath = existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: [
    {
      command: "npx tsx src/e2e/serve.ts",
      cwd: "../artifacts/api-server",
      url: `http://localhost:${API_PORT}/projects`,
      env: { DATABASE_URL, E2E_API_PORT: API_PORT },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npx next dev -p ${WEB_PORT}`,
      cwd: ".",
      url: `http://localhost:${WEB_PORT}`,
      env: { NEXT_PUBLIC_API_BASE_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
