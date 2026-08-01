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

  await page.getByRole('button', { name: '已解锁' }).click()
  await expect(page.locator('[data-badge-card][data-badge-state="unlocked"]')).toHaveCount(4)
})
