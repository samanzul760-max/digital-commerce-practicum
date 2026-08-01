import { expect, test } from '@playwright/test'

test('[SB-PROGRESS-001] progress page fits a 390px student viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/progress')

  await expect(page.locator('[data-student-growth]')).toBeVisible()
  await expect(page.locator('[data-overall-progress]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
