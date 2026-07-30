import { expect, test } from '@playwright/test'

test('owner reads a current-room plan analytics drilldown and students are rejected', async ({ page, browser }) => {
  const ownerResponse = await page.request.get('/api/practicum/analytics/plans/plan-wdds?roomId=room-001')
  expect(ownerResponse.status()).toBe(200)
  expect(await ownerResponse.json()).toEqual(expect.objectContaining({
    plan: expect.objectContaining({ id: 'plan-wdds', completionPercent: expect.any(Number) }),
    activities: expect.any(Array),
  }))

  const context = await browser.newContext()
  const student = await context.newPage()
  await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
  const forbidden = await student.request.get('/api/practicum/analytics/plans/plan-wdds?roomId=room-001')
  expect(forbidden.status()).toBe(403)
  expect((await forbidden.json()).data.code).toBe('PLAN_ANALYTICS_FORBIDDEN')
  await context.close()
})
