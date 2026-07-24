import { expect, test } from '@playwright/test'

/**
 * Given the academy website and practicum workspace are separate projects
 * When a user opens the independent practicum address
 * Then no academy navigation, footer, brand copy or academy route is rendered
 */
test('[ORIGINAL-S1-001] independent practicum renders without academy-site chrome', async ({ page }) => {
  await page.goto('/practicum')

  await expect(page.locator('[data-practicum]')).toBeVisible()
  await expect(page.getByText('数字马克思主义学院')).toHaveCount(0)
})
