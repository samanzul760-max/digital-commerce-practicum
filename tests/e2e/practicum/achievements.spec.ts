import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

test('[SB-ACH-001] student can inspect achievements, skills, badges and rewards', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-achievements-page]')).toBeVisible()
  await expect(page.locator('[data-achievement-overview]')).toBeVisible()
  await expect(page.locator('[data-skill-matrix]')).toBeVisible()
  await expect(page.locator('[data-badge-card]')).toHaveCount(8)
  await expect(page.locator('[data-achievement-timeline]')).toBeVisible()
  await expect(page.locator('[data-workspace-backbar]')).toBeVisible()
  await expect(page.locator('.achievement-visual')).toBeVisible()

  await page.getByRole('button', { name: '已解锁' }).click()
  await expect(page.locator('[data-badge-card][data-badge-state="unlocked"]')).toHaveCount(4)

  await page.goto('/practicum/progress')
  const achievementNavIcon = page.locator('a[href="/practicum/achievements"] .practicum-icon')
  await expect(achievementNavIcon).toBeVisible()
  expect((await achievementNavIcon.boundingBox())?.width ?? 0).toBeGreaterThan(0)
  await expect(page.locator('[data-workspace-backbar]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
