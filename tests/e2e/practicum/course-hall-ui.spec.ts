import { expect, test } from '@playwright/test'

test('[LEARN-EC-COURSES-001] student can browse responsive course hall and open a course', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/courses')

  await expect(page.locator('[data-course-hall]')).toBeVisible()
  await expect(page.locator('[data-course-card]').first()).toBeVisible()
  await page.screenshot({ path: 'output/playwright/learn-ec-course-hall-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-course-hall]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'output/playwright/learn-ec-course-hall-mobile.png', fullPage: true })

  await page.locator('[data-course-card]').first().getByRole('link', { name: '查看课程' }).click()
  await expect(page.locator('[data-course-detail]')).toBeVisible()
})
