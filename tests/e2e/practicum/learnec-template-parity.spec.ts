import { expect, test } from '@playwright/test'

async function loginAsStudent(page: import('@playwright/test').Page) {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
}

test('[LEARN-EC-PARITY-001] practicum pages use the unified workspace shell', async ({ page }) => {
  await loginAsStudent(page)

  await page.goto('/practicum')
  await expect(page.locator('[data-practicum-sidebar]')).toBeVisible()
  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
  await expect(page.locator('[data-current-organization]')).toBeVisible()
  await expect(page.locator('[data-student-home]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '今日运营工作队列' })).toBeVisible()
  await expect(page.locator('.hero, .hero-scene')).toHaveCount(0)

  await page.goto('/practicum/courses')
  await expect(page.locator('.course-layout .filters')).toBeVisible()
  await expect(page.locator('.course-tools .search')).toBeVisible()
  await expect(page.locator('.grid .course-card .course-banner').first()).toBeVisible()

  await page.goto('/practicum/progress')
  await expect(page.locator('.dashboard .side')).toBeVisible()
  await expect(page.locator('.dash-welcome')).toBeVisible()
  await expect(page.locator('[data-student-growth]')).toBeVisible()
  await expect(page.locator('[data-progress-entry-card]')).not.toHaveCount(0)
  await expect(page.locator('.calendar')).toBeVisible()

  await page.goto('/practicum/learn/plan-wdds')
  await expect(page.locator('.learning .outline')).toBeVisible()
  await expect(page.locator('.learning .lesson')).toBeVisible()
  await expect(page.locator('.learning .video')).toBeVisible()
  await expect(page.locator('.learning .drawer')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/practicum/courses')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
