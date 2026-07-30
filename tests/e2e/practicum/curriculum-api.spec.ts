import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test.describe('curriculum API contract', () => {
  test('[SB-P-11][SB-Q-06] owner reads server-derived curriculum deletion impact', async ({ page }) => {
    const response = await page.request.get('/api/practicum/plans/plan-wdds/nodes/unit-01-01/delete-impact')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ descendantCount: 12, activityCount: 12, evidenceCount: 0 })
  })

  test('owner creates a top-level curriculum node and receives the updated server snapshot', async ({ page }) => {
    const key = `curriculum-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { roomId: 'room-001', title: `目录 API ${key}`, description: '用于验证服务端目录树写入' },
    })
    expect(created.status()).toBe(201)
    const plan = (await created.json()).plan

    const response = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-module` }),
      data: { title: '第一模块', level: 1, parentId: null, version: plan.version },
    })

    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.plan.version).toBe(plan.version + 1)
    expect(body.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ planId: plan.id, level: 1, parentId: null, title: '第一模块' }),
    ]))
  })

  test('owner renames a curriculum node with version protection', async ({ page }) => {
    const key = `curriculum-rename-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { roomId: 'room-001', title: `目录重命名 ${key}`, description: '用于验证服务端目录更新' },
    })
    const plan = (await created.json()).plan
    const nodeResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(page),
      data: { title: '待重命名目录', level: 1, parentId: null, version: plan.version },
    })
    const nodeSnapshot = await nodeResponse.json()
    const node = nodeSnapshot.nodes.find((item: { title: string }) => item.title === '待重命名目录')

    const renamed = await page.request.patch(`/api/practicum/plans/${plan.id}/nodes/${node.id}`, {
      headers: await csrfHeaders(page),
      data: { title: '已重命名目录', version: nodeSnapshot.plan.version },
    })
    expect(renamed.status()).toBe(200)
    expect((await renamed.json()).nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: node.id, title: '已重命名目录' }),
    ]))

    const stale = await page.request.patch(`/api/practicum/plans/${plan.id}/nodes/${node.id}`, {
      headers: await csrfHeaders(page),
      data: { title: '不应保存', version: nodeSnapshot.plan.version },
    })
    expect(stale.status()).toBe(409)
    expect((await stale.json()).data.code).toBe('PLAN_VERSION_CONFLICT')
  })

  test('owner deletes an empty curriculum node and receives the updated snapshot', async ({ page }) => {
    const key = `curriculum-delete-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', { headers: await csrfHeaders(page, { 'Idempotency-Key': key }), data: { roomId: 'room-001', title: `目录删除 ${key}`, description: '用于验证服务端目录删除' } })
    const plan = (await created.json()).plan
    const nodeResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, { headers: await csrfHeaders(page), data: { title: '待删除目录', level: 1, parentId: null, version: plan.version } })
    const snapshot = await nodeResponse.json()
    const node = snapshot.nodes.find((item: { title: string }) => item.title === '待删除目录')

    const removed = await page.request.delete(`/api/practicum/plans/${plan.id}/nodes/${node.id}`, { headers: await csrfHeaders(page), data: { version: snapshot.plan.version } })
    expect(removed.status()).toBe(200)
    expect((await removed.json()).nodes).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: node.id })]))
  })

  test('[BDD-CURRICULUM-003] owner creates an idempotent custom activity below a unit', async ({ page }) => {
    const key = `custom-activity-${Date.now()}`
    const created = await page.request.post('/api/practicum/plans', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { roomId: 'room-001', title: `Custom activity ${key}`, description: 'Verify a server-owned activity.' },
    })
    const plan = (await created.json()).plan
    const moduleResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(page),
      data: { title: 'Module', level: 1, parentId: null, version: plan.version },
    })
    const moduleSnapshot = await moduleResponse.json()
    const module = moduleSnapshot.nodes.find((item: { level: number }) => item.level === 1)
    const unitResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(page),
      data: { title: 'Unit', level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
    })
    const unitSnapshot = await unitResponse.json()
    const unit = unitSnapshot.nodes.find((item: { level: number }) => item.level === 2)
    const input = { parentId: unit.id, title: 'Custom training', type: 'TRAINING', version: unitSnapshot.plan.version }

    const first = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-write` }),
      data: input,
    })
    const replay = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-write` }),
      data: input,
    })

    expect(first.status()).toBe(201)
    expect(replay.status()).toBe(200)
    const firstBody = await first.json()
    const replayBody = await replay.json()
    const node = firstBody.nodes.find((item: { title: string }) => item.title === 'Custom training')
    expect(node).toEqual(expect.objectContaining({ level: 3, parentId: unit.id, activityType: 'TRAINING' }))
    expect(firstBody.activities).toEqual(expect.arrayContaining([expect.objectContaining({ id: node.activityId, type: 'TRAINING', config: { type: 'TRAINING', maxAttempts: 3 } })]))
    expect(replayBody.nodes.filter((item: { title: string }) => item.title === 'Custom training')).toHaveLength(1)
  })
})
