import { expect, test } from '@playwright/test'

/**
 * Given a student is preparing a practice activity
 * When the student saves a non-empty draft
 * Then the draft survives refresh without creating a submitted version
 */
test('[ASSUME-S3-001] student saves a practice draft without a version', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('这是一份可继续编辑的实践草稿。')
  await page.locator('[data-save-draft]').click()
  await expect(page.locator('[data-draft-saved]')).toBeVisible()
  await expect(page.locator('[data-submission-version]')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('[data-practice-draft]')).toHaveValue('这是一份可继续编辑的实践草稿。')
  await expect(page.locator('[data-submission-version]')).toHaveCount(0)
})
