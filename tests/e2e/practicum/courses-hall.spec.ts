import { expect, test } from '@playwright/test'

test('[LEARN-EC-002] course hall provides compact course search and course entry', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/courses')

  await expect(page.locator('[data-course-hall]')).toBeVisible()
  await expect(page.locator('[data-course-search]')).toBeVisible()
  await expect(page.locator('[data-course-card]').first()).toBeVisible()
})
