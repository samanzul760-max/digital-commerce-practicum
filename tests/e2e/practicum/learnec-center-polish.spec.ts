import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

test('[CENTER-001] student center exposes the personal menu entry and labeled demo cases', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/center')

  await expect(page.locator('[data-personal-entry]')).toBeVisible()
  await expect(page.locator('[data-center-demo-case]')).toHaveCount(3)
  await expect(page.locator('[data-center-demo-case]').first()).toContainText('演示内容')
})

test('[CENTER-002] student center waits for the shared session and workspace initialization', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/center')

  await expect(page.locator('[data-center-loading]')).toHaveCount(0)
  await expect(page.locator('[data-center-load-error]')).toHaveCount(0)
  await expect(page.locator('[data-center-real-progress], [data-center-demo-cases]')).toHaveCount(1)
})

test('[CENTER-003] center does not replace a failed progress request with demo cases', async ({ page }) => {
  await page.route('**/api/practicum/progress**', async route => {
    if (route.request().method() === 'GET') await route.abort('failed')
    else await route.continue()
  })
  await loginAsStudent(page)
  await page.goto('/center')

  await expect(page.locator('[data-center-load-error]')).toBeVisible()
  await expect(page.locator('[data-center-demo-cases]')).toHaveCount(0)
})

test('[CENTER-004] center has no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsStudent(page)
  await page.goto('/center')

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
