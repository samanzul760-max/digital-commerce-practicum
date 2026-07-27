import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    storageState: 'output/playwright/auth-state.json',
    channel: 'msedge',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: 'set NUXT_IGNORE_LOCK=1&& set PRACTICUM_DATA_DIR=.data-e2e&& npm.cmd run dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175/practicum',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
