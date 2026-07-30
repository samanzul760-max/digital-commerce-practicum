import { expect, test } from '@playwright/test'

test('owner exports current-room analytics as CSV and students are rejected', async ({ page, browser }) => {
  const ownerResponse = await page.request.get('/api/practicum/analytics/export?roomId=room-001')
  expect(ownerResponse.status()).toBe(200)
  expect(ownerResponse.headers()['content-type']).toContain('text/csv')
  expect(await ownerResponse.text()).toContain('member_id,plan_title,activity_title,status,version,score')

  const context = await browser.newContext()
  const student = await context.newPage()
  await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
  const forbidden = await student.request.get('/api/practicum/analytics/export?roomId=room-001')
  expect(forbidden.status()).toBe(403)
  expect((await forbidden.json()).data.code).toBe('ANALYTICS_EXPORT_FORBIDDEN')
  await context.close()
})
