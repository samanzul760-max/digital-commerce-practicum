import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test('[BDD-PLAN-019] plan detail loads a server-created plan absent from the browser store', async ({ page }) => {
  const title = `Server source ${Date.now()}`
  const created = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `server-source-${Date.now()}` }),
    data: { roomId: 'room-001', title, description: 'This plan exists only in the server repository.' },
  })
  expect(created.status()).toBe(201)
  const plan = (await created.json()).plan

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto(`/practicum/plans/${plan.id}`)

  await expect(page.locator('[data-plan-detail] h1')).toHaveText(title)
  await expect(page.locator('[data-plan-detail]')).not.toHaveText('计划未找到')
})

test('[BDD-PLAN-020] curriculum editor uses the server snapshot across create and reload', async ({ page, browser }) => {
  const key = `editor-server-${Date.now()}`
  const created = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
    data: { roomId: 'room-001', title: `Server editor ${key}`, description: 'Server-owned curriculum editor scenario.' },
  })
  expect(created.status()).toBe(201)
  let snapshot = await created.json()

  const createNode = async (title: string, level: number, parentId: string | null) => {
    const response = await page.request.post(`/api/practicum/plans/${snapshot.plan.id}/nodes`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-${title}` }),
      data: { title, level, parentId, version: snapshot.plan.version },
    })
    expect(response.status()).toBe(201)
    snapshot = await response.json()
    return snapshot.nodes.find((node: { title: string }) => node.title === title)
  }

  const module = await createNode('Server module', 1, null)
  const unit = await createNode('Server unit', 2, module.id)
  const activity = await page.request.post(`/api/practicum/plans/${snapshot.plan.id}/activities`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-activity` }),
    data: { parentId: unit.id, title: 'Server activity', type: 'TRAINING', version: snapshot.plan.version },
  })
  expect(activity.status()).toBe(201)
  snapshot = await activity.json()

  await page.goto(`/practicum/plans/${snapshot.plan.id}/edit`)
  await expect(page.locator('[data-plan-editor] h1')).toHaveText(snapshot.plan.title)
  const moduleRow = page.locator('[data-module]').filter({ hasText: 'Server module' })
  await expect(moduleRow).toBeVisible()
  if (await moduleRow.locator('[data-module-toggle]').getAttribute('aria-expanded') === 'false') await moduleRow.locator('[data-module-toggle]').click()
  await expect(page.locator('[data-unit]').filter({ hasText: 'Server unit' })).toBeVisible()
  const unitRow = page.locator('[data-unit]').filter({ hasText: 'Server unit' })
  if (await unitRow.locator('[data-unit-toggle]').getAttribute('aria-expanded') === 'false') await unitRow.locator('[data-unit-toggle]').click()
  await expect(page.locator('[data-activity]').filter({ hasText: 'Server activity' })).toBeVisible()

  await page.locator('[data-create-activity]').click()
  await page.locator('[data-activity-title-input]').fill('Created in editor')
  await page.locator('[data-activity-submit]').click()
  await expect(page.locator('[data-activity]').filter({ hasText: 'Created in editor' })).toBeVisible()
  await page.reload()
  const reloadedModule = page.locator('[data-module]').filter({ hasText: 'Server module' })
  await reloadedModule.locator('[data-module-toggle]').click()
  const reloadedUnit = page.locator('[data-unit]').filter({ hasText: 'Server unit' })
  await reloadedUnit.locator('[data-unit-toggle]').click()
  await expect(page.locator('[data-activity]').filter({ hasText: 'Created in editor' })).toBeVisible()

  const persisted = await page.request.get(`/api/practicum/plans/${snapshot.plan.id}`)
  expect(persisted.status()).toBe(200)
  expect((await persisted.json()).nodes).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Created in editor', level: 3 })]))

  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
  await student.goto(`/practicum/plans/${snapshot.plan.id}/edit`)
  await expect(student.locator('[data-forbidden]')).toBeVisible()
  await expect(student.locator('[data-plan-editor]')).toHaveCount(0)
  expect((await student.request.get(`/api/practicum/plans/${snapshot.plan.id}`)).status()).toBe(403)
  await studentContext.close()
})
