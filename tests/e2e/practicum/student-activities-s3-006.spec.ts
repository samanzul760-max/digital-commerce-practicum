import { expect, test } from '@playwright/test'

/**
 * Given a student saved a valid practice draft
 * When the student confirms submission
 * Then an immutable numbered version and submitted status survive refresh
 */
test('[ASSUME-S3-001] student submits an immutable practice version', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('第一版不可变实践成果')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-version]')).toContainText('版本 1')
  await page.reload()
  await expect(page.locator('[data-submission-version]')).toHaveCount(1)
  await expect(page.locator('[data-submission-version]')).toContainText('第一版不可变实践成果')
  await expect(page.locator('[data-submission-status]')).toHaveText('已提交')
})
