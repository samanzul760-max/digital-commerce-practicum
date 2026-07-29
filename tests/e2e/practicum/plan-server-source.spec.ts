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
