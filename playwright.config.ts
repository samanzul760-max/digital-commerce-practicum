import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    storageState: process.env.PLAYWRIGHT_AUTH_STATE_PATH ?? 'output/playwright/auth-state.json',
    channel: 'msedge',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 4175',
    env: {
      NUXT_IGNORE_LOCK: '1',
      PRACTICUM_DATA_DIR: '.data-e2e',
    },
    url: `${baseURL}/practicum`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
