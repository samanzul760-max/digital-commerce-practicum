import { expect, test } from '@playwright/test'

/**
 * Given a student is learning from a published plan
 * When the student opens a direct activity URL from a draft or archived plan
 * Then the activity data is not exposed and the latest available position is restored
 */
test('[ASSUME-S3-001] student accesses published learning only and resumes the latest position', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/learn/plan-wdds')
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  const selectedActivity = page.locator('[data-activity]').nth(1)
  const selectedActivityId = await selectedActivity.getAttribute('href')
  await selectedActivity.click()
  await expect(page).toHaveURL(selectedActivityId!)
  await page.locator('[data-back-link]').click()
  await expect(page).toHaveURL('/practicum/learn/plan-wdds')
  await page.reload()
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  await expect(page.locator('[data-current-activity]')).toHaveAttribute('href', selectedActivityId!)

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill('学生不可访问的草稿')
  await page.locator('[data-plan-desc-input]').fill('用于验证直接链接权限')
  await page.locator('[data-plan-submit]').click()
  const draftPlan = page.locator('[data-plan-card]').filter({ hasText: '学生不可访问的草稿' })
  await draftPlan.getByRole('link').click()
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill('草稿模块')
  await page.locator('[data-node-submit]').click()
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-create-unit]').click()
  await page.locator('[data-node-title-input]').fill('草稿单元')
  await page.locator('[data-node-submit]').click()
  await page.locator('[data-unit-toggle]').first().click()
  await page.locator('[data-create-activity]').click()
  await page.locator('[data-activity-title-input]').fill('草稿活动')
  await page.locator('[data-activity-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/node-custom-202')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-activity-page]')).toHaveCount(0)

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/plans/plan-wdds/edit')
  await page.locator('[data-request-archive]').click()
  await page.locator('[data-confirm-archive]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-001')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-activity-page]')).toHaveCount(0)

  await page.goto('/practicum/activities/missing-activity')
  await expect(page.locator('[data-empty]')).toBeVisible()
})
