import { expect, test } from '@playwright/test'
import { loginAsStudent, loginAsTeacher } from './auth-helpers'

test('[ORIGINAL-S7-001] workspace sidebar highlights the current route', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  const checks = [
    { route: '/practicum', key: 'workspace' },
    { route: '/practicum/courses', key: 'plans' },
    { route: '/practicum/cases', key: 'cases' },
    { route: '/practicum/reviews', key: 'reviews' },
  ]

  for (const item of checks) {
    await page.goto(item.route)
    await expect(page.locator(`[data-nav-key="${item.key}"]`)).toHaveAttribute('aria-current', 'page')
  }
})

test('[ORIGINAL-S7-001] student mobile navigation keeps the sidebar and hides admin entries', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await loginAsStudent(page)
  await page.goto('/practicum/shop/products')

  await expect(page.locator('[data-practicum-sidebar]')).toBeVisible()
  await expect(page.locator('[data-nav-key="shop"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-nav-key="reviews"], [data-nav-key="data-center"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('[ORIGINAL-S7-001] student direct URL guards still block administration pages', async ({ page }) => {
  await loginAsStudent(page)
  for (const route of ['/practicum/resources', '/practicum/members', '/practicum/room-settings', '/practicum/reviews', '/practicum/data-center']) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }
})

test('[ORIGINAL-S7-001] teacher topbar only exposes accessible entries', async ({ page }) => {
  await loginAsTeacher(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/cases"]')).toHaveCount(1)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/classes"]')).toHaveCount(1)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/progress"]')).toHaveCount(0)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/reviews"]')).toHaveCount(0)
})

test('[TASK-4] teacher navigation exposes scoped classroom, progress, and review entries', async ({ page }) => {
  await loginAsTeacher(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/classes"]')).toHaveCount(1)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/progress"]')).toHaveCount(1)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/reviews"]')).toHaveCount(1)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/plans"]')).toHaveCount(0)
  await expect(page.locator('[data-opendesign-primary-nav] a[href="/practicum/members"]')).toHaveCount(0)
})

test('[ORIGINAL-S7-001] commerce case pages fit four approved viewport widths', async ({ browser }) => {
  for (const width of [375, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 820 } })
    const page = await context.newPage()
    await loginAsStudent(page)
    for (const route of ['/practicum/cases', '/practicum/cases/case-selling-points']) {
      await page.goto(route)
      await expect(page.locator('[data-practicum-shell]')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} at ${width}px has horizontal overflow`).toBe(true)
    }
    await context.close()
  }
})
