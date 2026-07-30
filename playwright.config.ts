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
    command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 4175',
    env: {
      NUXT_IGNORE_LOCK: '1',
      PRACTICUM_DATA_DIR: '.data-e2e',
    },
    url: 'http://127.0.0.1:4175/practicum',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
