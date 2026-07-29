import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test.describe('workspace context API contract', () => {
  test('[SB-G-02][SB-G-03][SB-G-04] owner receives the selected organization, room, and role', async ({ page }) => {
    const response = await page.request.get('/api/practicum/context')

    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      user: expect.objectContaining({ role: 'OWNER' }),
      organization: expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      room: expect.objectContaining({ id: 'room-001', title: expect.any(String), teachingMode: expect.any(String) }),
      organizations: expect.arrayContaining([expect.objectContaining({ id: expect.any(String), roomIds: expect.arrayContaining(['room-001']) })]),
    }))
  })

  test('[SB-Q-02][SB-Q-03] teacher receives only their authorized room context', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const login = await page.request.post('/api/auth/login', {
      data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' },
    })
    expect(login.status()).toBe(200)

    const response = await page.request.get('/api/practicum/context')
    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      user: expect.objectContaining({ role: 'TEACHER' }),
      room: expect.objectContaining({ id: 'room-001' }),
      organizations: expect.arrayContaining([expect.objectContaining({ roomIds: ['room-001'] })]),
    }))
    await context.close()
  })

  test('[SB-G-03][SB-Q-01] owner can persist an authorized workspace selection in the current session', async ({ page }) => {
    const selected = await page.request.post('/api/practicum/organizations/org-demo/select', {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001' },
    })

    expect(selected.status()).toBe(200)
    await expect(selected.json()).resolves.toEqual(expect.objectContaining({
      organization: expect.objectContaining({ id: 'org-demo' }),
      room: expect.objectContaining({ id: 'room-001' }),
    }))

    const refreshed = await page.request.get('/api/practicum/context')
    await expect(refreshed.json()).resolves.toEqual(expect.objectContaining({
      organization: expect.objectContaining({ id: 'org-demo' }),
      room: expect.objectContaining({ id: 'room-001' }),
    }))
  })
})
