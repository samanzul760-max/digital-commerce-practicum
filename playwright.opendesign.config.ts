import { defineConfig } from '@playwright/test'

if (!process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error('PLAYWRIGHT_BASE_URL is required for OpenDesign UI tests.')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'practicum/opendesign-ui-integration.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    channel: 'msedge',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
  },
})
