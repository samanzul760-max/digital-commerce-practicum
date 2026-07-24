import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'msedge',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: 'set NUXT_IGNORE_LOCK=1&& npm.cmd run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/practicum',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
