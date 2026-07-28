import { expect, test } from '@playwright/test'

test.describe('curriculum API contract', () => {
  test('owner creates a top-level curriculum node and receives the updated server snapshot', async ({ page }) => {
    const key = `curriculum-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', {
      headers: { 'Idempotency-Key': key },
      data: { roomId: 'room-001', title: `目录 API ${key}`, description: '用于验证服务端目录树写入' },
    })
    expect(created.status()).toBe(201)
    const plan = (await created.json()).plan

    const response = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: { 'Idempotency-Key': `${key}-module` },
      data: { title: '第一模块', level: 1, parentId: null, version: plan.version },
    })

    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.plan.version).toBe(plan.version + 1)
    expect(body.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ planId: plan.id, level: 1, parentId: null, title: '第一模块' }),
    ]))
  })
})
