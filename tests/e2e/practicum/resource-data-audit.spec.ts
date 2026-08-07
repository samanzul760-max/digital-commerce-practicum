import { expect, test } from '@playwright/test'

test.describe('resource, data, notification, and audit server contracts', () => {
  test('[BDD-RDA-001] owner gets only the selected room overview and drill-down data', async ({ page }) => {
    const response = await page.request.get('/api/practicum/analytics/overview?roomId=room-001')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual(expect.objectContaining({
      analytics: expect.objectContaining({ overview: expect.any(Object), plans: expect.any(Array) }),
      stats: expect.any(Object),
      audit: expect.objectContaining({ total: expect.any(Number), recent: expect.any(Array) }),
    }))
  })

  test('[BDD-RDA-002] student cannot query manager overview or audit events', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })

    for (const path of ['/api/practicum/analytics/overview?roomId=room-001', '/api/practicum/audit?roomId=room-001']) {
      const response = await page.request.get(path)
      expect(response.status()).toBe(403)
      expect((await response.json()).data.code).toMatch(/(ANALYTICS_OVERVIEW|AUDIT)_FORBIDDEN/)
    }

    await context.close()
  })

  test('[BDD-RDA-004] resource and notification pages do not fall back to browser business data', async ({ page }) => {
    await page.route('**/api/practicum/resources**', route => route.abort('failed'))
    await page.goto('/practicum/resources')
    await expect(page.locator('[data-resource-error]')).toBeVisible()
    await expect(page.locator('[data-library-resource]')).toHaveCount(0)

    await page.unroute('**/api/practicum/resources**')
    await page.route('**/api/practicum/notifications', route => route.abort('failed'))
    await page.goto('/practicum/notifications')
    await expect(page.locator('[data-notifications-error]')).toBeVisible()
    await expect(page.locator('[data-notification-item]')).toHaveCount(0)
  })

  test('[BDD-RDA-005] audit query is room-scoped and supports filters', async ({ page }) => {
    const response = await page.request.get('/api/practicum/audit?roomId=room-001&eventType=NOTIFICATION_READ&limit=10')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual(expect.objectContaining({
      items: expect.any(Array),
      limit: 10,
    }))
  })
})
