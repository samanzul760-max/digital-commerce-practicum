import { request } from '@playwright/test'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'

export default async function globalSetup() {
  const baseURL = 'http://127.0.0.1:4175'
  rmSync('.data-e2e', { recursive: true, force: true })
  const authStatePath = 'output/playwright/auth-state.json'
  mkdirSync(dirname(authStatePath), { recursive: true })
  const context = await request.newContext({ baseURL })
  const response = await context.post('/api/auth/login', {
    data: { identifier: 'owner@example.test', password: 'OwnerPass123!' },
  })
  if (!response.ok()) {
    throw new Error(`E2E global login failed with status ${response.status()}`)
  }
  await context.storageState({ path: authStatePath })
  await context.dispose()
}
