import { expect, test } from '@playwright/test'

/**
 * Given a student is completing a software activity with required steps
 * When the student attempts completion before every required step is complete
 * Then the missing steps are named and completed progress is retained
 */
test('[ASSUME-S3-001] student completes required software steps', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-001')

  await page.locator('[data-complete-software]').click()
  await expect(page.locator('[data-incomplete-error]')).toContainText('阅读并同意平台入驻协议')
  await expect(page.locator('[data-incomplete-error]')).toContainText('上传营业执照')

  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()
  await page.locator('[data-complete-software]').click()
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.locator('[data-step-checkbox]').nth(0)).toBeChecked()
  await expect(page.locator('[data-step-checkbox]').nth(1)).toBeChecked()
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()

  await page.goto('/practicum')
  await expect(page.locator('[data-plan-progress] [role="progressbar"]')).not.toHaveAttribute('aria-valuenow', '0')
})
