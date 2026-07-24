import { expect, test } from '@playwright/test'

/**
 * Given a student completed two software activities
 * When the student confirms reset for one activity
 * Then only that activity attempt is cleared and progress changes accordingly
 */
test('[ASSUME-S3-001] student resets only the current software activity', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill('重置隔离计划')
  await page.locator('[data-plan-desc-input]').fill('验证重置不会影响其他活动')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: '重置隔离计划' }).getByRole('link').click()
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill('模块')
  await page.locator('[data-node-submit]').click()
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-create-unit]').click()
  await page.locator('[data-node-title-input]').fill('单元')
  await page.locator('[data-node-submit]').click()
  await page.locator('[data-unit-toggle]').first().click()
  await page.locator('[data-create-activity]').click()
  await page.locator('[data-activity-title-input]').fill('另一项软件活动')
  await page.locator('[data-activity-submit]').click()
  await page.locator('[data-request-publish]').click()
  await page.locator('[data-confirm-publish]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-001')
  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()
  await page.locator('[data-complete-software]').click()
  await page.goto('/practicum/activities/node-custom-202')
  await page.locator('[data-complete-software]').click()
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()

  await page.goto('/practicum/activities/act-01-001')
  await page.locator('[data-reset-software]').click()
  await expect(page.locator('[data-reset-impact]')).toContainText('不会影响其他活动')
  await page.locator('[data-reset-confirm]').click()
  await page.reload()
  await expect(page.locator('[data-step-checkbox]').nth(0)).not.toBeChecked()
  await expect(page.getByText('未完成', { exact: true })).toBeVisible()
  await page.goto('/practicum/activities/node-custom-202')
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()
})
