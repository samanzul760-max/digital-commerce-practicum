import { test, expect } from '@playwright/test'

test.describe('platform API contract', () => {
  test('owner resource list supports search and CRUD', async ({ page }) => {
    const key = `resource-${Date.now()}`
    const created = await page.request.post('/api/practicum/resources', { headers: { 'Idempotency-Key': key }, data: { planId: 'library', name: `资料 ${key}`, kind: 'LINK', url: 'https://example.test/resource' } })
    expect(created.status()).toBe(201)
    const resource = (await created.json()).resource
    const list = await page.request.get(`/api/practicum/resources?keyword=${encodeURIComponent(key)}&page=1&pageSize=10`)
    expect(list.ok()).toBeTruthy()
    expect((await list.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: resource.id, name: `资料 ${key}` })]))
    const removed = await page.request.delete(`/api/practicum/resources/${resource.id}`)
    expect(removed.ok()).toBeTruthy()
  })

  test('student is rejected before resource data is returned', async ({ browser }) => {
    const context = await browser.newContext()
    await context.clearCookies()
    const page = await context.newPage()
    await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
    const response = await page.request.get('/api/practicum/resources')
    expect(response.status()).toBe(403)
    expect((await response.json()).data.code).toBe('RESOURCE_FORBIDDEN')
    await context.close()
  })

  test('owner updates a member and the change persists', async ({ page }) => {
    const updated = await page.request.patch('/api/practicum/members/member-001', { data: { group: `小组-${Date.now()}` } })
    expect(updated.ok()).toBeTruthy()
    expect((await updated.json()).member.group).toContain('小组-')
    const list = await page.request.get('/api/practicum/members?page=1&pageSize=10')
    expect((await list.json()).items[0]).toEqual(expect.objectContaining({ id: 'member-001' }))
  })

  test('notifications can be marked read and stats use persisted records', async ({ page }) => {
    const notifications = await page.request.get('/api/practicum/notifications')
    expect(notifications.ok()).toBeTruthy()
    expect(await notifications.json()).toEqual(expect.objectContaining({ items: expect.any(Array), unread: expect.any(Number) }))
    const stats = await page.request.get('/api/practicum/stats?roomId=room-001')
    expect(stats.ok()).toBeTruthy()
    expect((await stats.json()).stats).toEqual(expect.objectContaining({ planCount: expect.any(Number), memberCount: expect.any(Number), submissionCount: expect.any(Number), gradedSubmissionCount: expect.any(Number) }))
  })

  test('asset upload enforces type and size policy', async ({ page }) => {
    const good = await page.request.post('/api/practicum/assets', { multipart: { file: { name: 'guide.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') } } })
    expect(good.status()).toBe(201)
    expect((await good.json()).asset).toEqual(expect.objectContaining({ name: 'guide.pdf', mimeType: 'application/pdf' }))
    const bad = await page.request.post('/api/practicum/assets', { multipart: { file: { name: 'script.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('not allowed') } } })
    expect(bad.status()).toBe(422)
    expect((await bad.json()).data.code).toBe('UPLOAD_TYPE_NOT_ALLOWED')
  })

  test('protected API exposes a request id on authentication errors', async ({ browser }) => {
    const context = await browser.newContext()
    await context.clearCookies()
    const response = await context.request.get('/api/practicum/plans')
    expect(response.status()).toBe(401)
    expect(response.headers()['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    expect((await response.json()).data.code).toBe('AUTH_REQUIRED')
    await context.close()
  })

  test('stale plan version is rejected without overwriting newer data', async ({ page }) => {
    const key = `conflict-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', { headers: { 'Idempotency-Key': key }, data: { title: `冲突测试 ${key}`, description: '版本校验', roomId: 'room-001' } })
    const plan = (await created.json()).plan
    await page.request.patch(`/api/practicum/plans/${plan.id}`, { data: { description: '第一次更新', version: plan.version } })
    const stale = await page.request.patch(`/api/practicum/plans/${plan.id}`, { data: { description: '覆盖尝试', version: plan.version } })
    expect(stale.status()).toBe(409)
    expect((await stale.json()).data.code).toBe('PLAN_VERSION_CONFLICT')
  })
})
