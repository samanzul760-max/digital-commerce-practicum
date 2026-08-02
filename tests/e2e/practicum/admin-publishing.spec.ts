import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent } from './auth-helpers'
import { csrfHeaders } from './csrf'

test('OWNER can create a draft course from the course hall', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/courses')
  await page.locator('[data-create-plan]').click()
  await expect(page.locator('[data-create-plan-form]')).toBeVisible()
  await page.locator('[data-plan-title-input]').fill(`New course ${Date.now()}`)
  await page.locator('[data-plan-desc-input]').fill('Course description for publishing flow.')
  await page.locator('[data-plan-submit]').click()
  await expect(page).toHaveURL(/\/practicum\/plans\/[^/]+\/edit$/)
})

test('OWNER can select multiple draft courses and publish them in one action', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/courses')
  await expect(page.locator('[data-bulk-publish]')).toBeVisible()
  await page.locator('[data-plan-select]').first().check()
  await page.locator('[data-bulk-publish]').click()
  await expect(page.locator('[data-bulk-result]')).toBeVisible()
})

test('STUDENT does not see owner publishing controls', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/courses')
  await expect(page.locator('[data-create-plan]')).toHaveCount(0)
  await expect(page.locator('[data-bulk-publish]')).toHaveCount(0)
})

test('OWNER can publish a targeted notification and see its send history', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/notifications')
  await page.locator('[data-notification-compose]').fill(`Course reminder ${Date.now()}`)
  await page.locator('[data-notification-message]').fill('Please complete the listing practice this week.')
  await page.locator('[data-notification-send]').click()
  await expect(page.locator('[data-notification-history]')).toContainText('Course reminder')
})

test('publishing pages fit a 390px viewport and student API writes are forbidden', async ({ page }) => {
  await loginAsStudent(page)
  const notificationResponse = await page.request.post('/api/practicum/notifications', {
    data: { title: 'blocked', message: 'blocked' },
  })
  expect(notificationResponse.status()).toBe(403)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/practicum/courses')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('student sees an owner notification after refreshing the notifications page', async ({ page }) => {
  await page.context().clearCookies()
  await loginAsOwner(page)
  const title = `Refresh notice ${Date.now()}`
  const sendResponse = await page.request.post('/api/practicum/notifications', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `e2e-${Date.now()}` }),
    data: { title, message: 'A new practice is available.' },
  })
  expect(sendResponse.status()).toBe(201)
  await loginAsStudent(page)
  await page.goto('/practicum/notifications')
  await expect(page.locator('[data-notification-history]')).toContainText(title)
  await page.reload()
  await expect(page.locator('[data-notification-history]')).toContainText(title)
})
