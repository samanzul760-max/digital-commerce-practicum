import { expect, test } from '@playwright/test'

/**
 * Given a student has a training activity with an attempt limit
 * When the student submits valid answers until the limit is reached
 * Then each attempt and deterministic feedback remain available after refresh
 */
test('[ASSUME-S3-001] student retains limited training attempts and feedback', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-002')

  await page.locator('[data-training-answer]').fill('完整的店铺名称、经营类目和客服联系方式')
  await page.locator('[data-training-submit]').click()
  await page.locator('[data-training-answer]').fill('另一份完整的店铺信息说明')
  await page.locator('[data-training-submit]').click()
  await page.locator('[data-training-answer]').fill('第三份完整的店铺信息说明')
  await page.locator('[data-training-submit]').click()
  await expect(page.locator('[data-training-attempt]')).toHaveCount(3)
  await expect(page.locator('[data-training-submit]')).toBeDisabled()

  await page.reload()
  await expect(page.locator('[data-training-attempt]')).toHaveCount(3)
  await expect(page.locator('[data-training-attempt]').first()).toContainText('回答已记录')
  await expect(page.locator('[data-training-submit]')).toBeDisabled()
})
