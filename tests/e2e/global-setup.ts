import { request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175'
  const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE_PATH
  if (!process.env.PRACTICUM_E2E_RUN_ID || !authStatePath) {
    throw new Error('Run Playwright through scripts/run-isolated-e2e.mjs so test data remains isolated.')
  }
  mkdirSync(dirname(authStatePath), { recursive: true })
  const context = await request.newContext({ baseURL })
  const response = await context.post('/api/auth/login', {
    data: { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD },
  })
  if (!response.ok()) {
    throw new Error(`E2E global login failed with status ${response.status()}`)
  }
  await context.storageState({ path: authStatePath })
  await context.dispose()
}
