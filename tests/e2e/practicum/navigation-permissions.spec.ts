import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

/**
 * Given a user is in the practicum workspace
 * When the user navigates between workspace routes
 * Then the matching sidebar entry is highlighted with aria-current
 */
test('[ORIGINAL-S7-001] sidebar active state follows the current route', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  const checks = [
    { route: '/practicum', nav: 'workspace' },
    { route: '/practicum/plans/plan-wdds', nav: 'plans' },
    { route: '/practicum/resources', nav: 'plans' },
    { route: '/practicum/cases', nav: 'cases' },
    { route: '/practicum/cases/case-selling-points', nav: 'cases' },
    { route: '/practicum/reviews', nav: 'reviews' },
    { route: '/practicum/members', nav: 'reviews' },
    { route: '/practicum/room-settings', nav: 'reviews' },
    { route: '/practicum/data-center', nav: 'data-center' },
  ]

  for (const item of checks) {
    await page.goto(item.route)
    const active = page.locator(`[data-nav-key="${item.nav}"]`)
    await expect(active).toHaveAttribute('aria-current', 'page')
    await expect(active).toHaveClass(/nav-item-active/)
  }
})

/**
 * Given a student is using the practicum workspace on mobile
 * When the student opens available workspace routes
 * Then the active directory entry stays visible and admin entries are hidden
 */
test('[ORIGINAL-S7-001] student mobile navigation highlights the current route and hides admin entries', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/cases/case-coupon-plan')

  await expect(page.locator('[data-nav-key="cases"]')).toHaveAttribute('aria-current', 'page')
  const visibleKeys = await page.locator('[data-nav-key]').evaluateAll(items =>
    items.map(item => item.getAttribute('data-nav-key')),
  )
  expect(visibleKeys).toEqual(['workspace', 'cases', 'tasks', 'progress'])

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(hasOverflow).toBe(false)
})

/**
 * Given a student knows direct administration URLs
 * When the student opens those URLs directly
 * Then the existing forbidden pages still block management data
 */
test('[ORIGINAL-S7-001] student direct URL guards still block administration pages', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()

  for (const route of ['/practicum/resources', '/practicum/members', '/practicum/room-settings', '/practicum/reviews', '/practicum/data-center']) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }
})

/**
 * Given the commerce case pages are part of the shared workspace
 * When the pages render at four approved viewport widths
 * Then no horizontal overflow occurs and the route-owned nav entry remains active
 */
test('[ORIGINAL-S7-001] commerce case pages fit four approved viewport widths', async ({ browser }) => {
  for (const width of [375, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 820 } })
    const page = await context.newPage()
    await loginAsStudent(page)
    await page.goto('/practicum/profile')
    await page.locator('[data-role-option="STUDENT"]').click()

    for (const route of ['/practicum/cases', '/practicum/cases/case-selling-points']) {
      await page.goto(route)
      await expect(page.locator('[data-nav-key="cases"]')).toHaveAttribute('aria-current', 'page')
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(hasOverflow, `${route} at ${width}px has horizontal overflow`).toBe(false)
    }

    await context.close()
  }
})
