import { defineConfig } from "@playwright/test";

// E2E 只在本地跑，不进 CI：用 dev-admin + 本机 Edge，避免下载 Chromium 与生产 secrets。
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DEV_LOGIN_PASSWORD: "e2e-pass-2026",
      DEV_LOGIN_USER: "admin",
      DEV_LOGIN_HANDLE: "zhanglei",
      NEXTAUTH_URL: "http://localhost:3100",
    },
  },
});
