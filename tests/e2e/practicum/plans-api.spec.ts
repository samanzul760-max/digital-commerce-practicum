import { test, expect } from '@playwright/test'

test.describe('plan API contract', () => {
  test('owner list supports query, pagination and stable response shape', async ({ page }) => {
    const response = await page.request.get('/api/practicum/plans?page=1&pageSize=1&sort=updatedAt&direction=desc')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body).toMatchObject({ page: 1, pageSize: 1, totalPages: expect.any(Number) })
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toEqual(expect.objectContaining({ id: expect.any(String), status: expect.any(String) }))
  })

  test('owner create is idempotent and returns a draft', async ({ page }) => {
    const key = `bdd-${Date.now()}`
    const input = { title: `API 计划 ${key}`, description: '用于验证服务端计划写入', roomId: 'room-001' }
    const first = await page.request.post('/api/practicum/plans', { headers: { 'Idempotency-Key': key }, data: input })
    const second = await page.request.post('/api/practicum/plans', { headers: { 'Idempotency-Key': key }, data: input })
    expect(first.status()).toBe(201)
    expect(second.status()).toBe(200)
    const firstBody = await first.json()
    const secondBody = await second.json()
    expect(firstBody.plan.id).toBe(secondBody.plan.id)
    expect(firstBody.plan.status).toBe('DRAFT')
  })

  test('student cannot see or read a draft plan', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
    expect(login.ok()).toBeTruthy()
    const list = await page.request.get('/api/practicum/plans?status=DRAFT')
    expect(list.ok()).toBeTruthy()
    expect((await list.json()).items).toHaveLength(0)
    const detail = await page.request.get('/api/practicum/plans/plan-wdsj')
    expect(detail.status()).toBe(403)
    expect((await detail.json()).data.code).toBe('PLAN_FORBIDDEN')
    await context.close()
  })

  test('owner updates and publishes a plan with version check', async ({ page }) => {
    const key = `publish-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', { headers: { 'Idempotency-Key': key }, data: { title: `待发布 ${key}`, description: '完整描述', roomId: 'room-001' } })
    const plan = (await created.json()).plan
    const updated = await page.request.patch(`/api/practicum/plans/${plan.id}`, { data: { description: '更新后的描述', version: plan.version } })
    expect(updated.ok()).toBeTruthy()
    const published = await page.request.post(`/api/practicum/plans/${plan.id}/publish`)
    expect(published.ok()).toBeTruthy()
    expect((await published.json()).plan.status).toBe('PUBLISHED')
  })
})
