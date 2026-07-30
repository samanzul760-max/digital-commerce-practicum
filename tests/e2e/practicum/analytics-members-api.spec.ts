import { expect, test } from '@playwright/test'

test.describe('member analytics API contract', () => {
  test('owner can read current-room member summaries and students are rejected', async ({ page, browser }) => {
    const ownerResponse = await page.request.get('/api/practicum/analytics/members?roomId=room-001')
    expect(ownerResponse.ok()).toBeTruthy()
    expect(await ownerResponse.json()).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({
          memberId: expect.any(String),
          learnerLabel: expect.any(String),
          completionPercent: expect.any(Number),
          gradedCount: expect.any(Number),
          avgScore: expect.any(Number),
        }),
      ]),
    }))

    const context = await browser.newContext()
    const student = await context.newPage()
    await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
    const forbidden = await student.request.get('/api/practicum/analytics/members?roomId=room-001')
    expect(forbidden.status()).toBe(403)
    expect((await forbidden.json()).data.code).toBe('MEMBER_ANALYTICS_FORBIDDEN')
    await context.close()
  })
})
