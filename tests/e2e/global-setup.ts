import { request } from '@playwright/test'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175'
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
  // Initialize every persisted room used by the E2E suite through the same server path as member analytics.
  // This seeds the TrainingRoom rows (room-001, room-002) without forcing prisma migrate reset.
  for (const roomId of ['room-001', 'room-002']) {
    const members = await context.get(`/api/practicum/members?roomId=${roomId}&pageSize=1`)
    if (!members.ok()) {
      throw new Error(`E2E room fixture for ${roomId} failed with status ${members.status()}`)
    }
  }
  await context.storageState({ path: authStatePath })
  await context.dispose()
}
