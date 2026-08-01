import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

test('[ORIGINAL-S7-001] LearnEC top navigation highlights the current route', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  const checks = [
    { route: '/practicum', label: '首页' },
    { route: '/practicum/courses', label: '课程大厅' },
    { route: '/practicum/progress', label: '学员中心' },
    { route: '/practicum/learn/plan-wdds', label: '实操学习' },
  ]

  for (const item of checks) {
    await page.goto(item.route)
    await expect(page.locator('.tabs a.active')).toContainText(item.label)
  }
})

test('[ORIGINAL-S7-001] student mobile navigation uses LearnEC tabs and hides admin chrome', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await loginAsStudent(page)
  await page.goto('/practicum/courses')

  await expect(page.locator('.tabs a.active')).toContainText('课程大厅')
  await expect(page.locator('.workspace-sidebar')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('[ORIGINAL-S7-001] student direct URL guards still block administration pages', async ({ page }) => {
  await loginAsStudent(page)

  for (const route of ['/practicum/resources', '/practicum/members', '/practicum/room-settings', '/practicum/reviews', '/practicum/data-center']) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }
})

test('[ORIGINAL-S7-001] commerce case pages fit four approved viewport widths', async ({ browser }) => {
  for (const width of [375, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 820 } })
    const page = await context.newPage()
    await loginAsStudent(page)

    for (const route of ['/practicum/cases', '/practicum/cases/case-selling-points']) {
      await page.goto(route)
      await expect(page.locator('.site')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} at ${width}px has horizontal overflow`).toBe(true)
    }

    await context.close()
  }
})
