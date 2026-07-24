import { expect, test } from '@playwright/test'

/**
 * Given the verified 网店运营 curriculum seed
 * When the independent project renders every activity
 * Then each of the 58 activities uses its explicit type rather than a title-based guess
 */
test('[CASE-S1-003] curriculum uses explicit activity types', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.getByRole('link', { name: /网店运营/ }).click()

  const moduleToggles = page.locator('[data-module-toggle]')
  await expect(moduleToggles).toHaveCount(6)
  for (const toggle of await moduleToggles.all()) {
    await toggle.click()
  }

  const unitToggles = page.locator('[data-unit-toggle]')
  await expect(unitToggles).toHaveCount(11)
  for (const toggle of await unitToggles.all()) {
    await toggle.click()
  }

  const activities = page.locator('[data-activity]')
  await expect(activities).toHaveCount(58)
  await expect(page.locator('[data-activity-type="SOFTWARE_ACTION"]')).toHaveCount(20)
  await expect(page.locator('[data-activity-type="TRAINING"]')).toHaveCount(13)
  await expect(page.locator('[data-activity-type="PRACTICE_ACTIVITY"]')).toHaveCount(25)
  await expect(page.locator('[data-activity]:has-text("商家入驻")')).toHaveAttribute('data-activity-type', 'SOFTWARE_ACTION')
  await expect(page.locator('[data-activity]:has-text("AI 图标设计练习")')).toHaveAttribute('data-activity-type', 'TRAINING')
  await expect(page.locator('[data-activity]:has-text("商品信息分类整理")')).toHaveAttribute('data-activity-type', 'PRACTICE_ACTIVITY')
})
