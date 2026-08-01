import { expect, test } from '@playwright/test'

async function loginAsStudent(page: import('@playwright/test').Page) {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
}

test('[LEARN-EC-PARITY-001] practicum pages use the LearnEC static template structure', async ({ page }) => {
  await loginAsStudent(page)

  await page.goto('/practicum')
  await expect(page.locator('.site')).toBeVisible()
  await expect(page.locator('.top')).toBeVisible()
  await expect(page.locator('.tabs')).toBeVisible()
  await expect(page.locator('.hero')).toBeVisible()
  await expect(page.locator('.hero-scene')).toBeVisible()
  await expect(page.locator('.wrap .cards .course-card').first()).toBeVisible()

  await page.goto('/practicum/courses')
  await expect(page.locator('.course-layout .filters')).toBeVisible()
  await expect(page.locator('.course-tools .search')).toBeVisible()
  await expect(page.locator('.grid .course-card .course-banner').first()).toBeVisible()

  await page.goto('/practicum/progress')
  await expect(page.locator('.dashboard .side')).toBeVisible()
  await expect(page.locator('.dash-welcome')).toBeVisible()
  await expect(page.locator('.medals .medal')).toHaveCount(3)
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
