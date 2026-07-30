import { expect, test } from '@playwright/test'

/**
 * Given an Owner has entered the practicum workspace
 * When the administrator overview is rendered
 * Then the workspace presents the refined shell and real management actions
 */
test('[ORIGINAL-S1-002] owner workspace presents the refined administration UI', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  await expect(page.locator('[data-owner-home] [data-admin-metric]')).toHaveCount(4)
  await expect(page.locator('[data-owner-home] [data-review-summary]')).toBeVisible()
  await expect(page.locator('[data-owner-home] [data-activity-feed]')).toBeVisible()
  await expect(page.locator('[data-practicum-sidebar] .product-sign')).toHaveCount(0)
  await expect(page.locator('[data-practicum-sidebar] [data-nav-key]')).toHaveCount(5)

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy()
  await page.screenshot({ path: 'output/playwright/admin-console-refresh-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy()
  await page.screenshot({ path: 'output/playwright/admin-console-refresh-mobile.png', fullPage: true })
})
