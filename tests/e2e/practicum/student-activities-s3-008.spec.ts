import { expect, test } from '@playwright/test'

/**
 * Given a student has learning, software, training and practice state
 * When the student reloads the practicum from its versioned storage record
 * Then every state and calculated progress is restored together
 */
test('[ASSUME-S3-001] student reload restores the coherent learning record', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()

  await page.goto('/practicum/learn/plan-wdds')
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  await page.locator('[data-activity]').nth(1).click()

  await page.goto('/practicum/activities/act-01-001')
  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()
  await page.locator('[data-complete-software]').click()

  await page.goto('/practicum/activities/act-01-002')
  await page.locator('[data-training-answer]').fill('完整的店铺信息说明')
  await page.locator('[data-training-submit]').click()

  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('统一记录中的实践成果')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await page.reload()
  await expect(page.locator('[data-practice-draft]')).toHaveValue('统一记录中的实践成果')
  await expect(page.locator('[data-submission-version]')).toHaveCount(1)
  await expect(page.locator('[data-submission-status]')).toHaveText('已提交')

  await page.goto('/practicum/activities/act-01-001')
  await expect(page.locator('[data-step-checkbox]').nth(0)).toBeChecked()
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()
  await page.goto('/practicum/activities/act-01-002')
  await expect(page.locator('[data-training-attempt]')).toHaveCount(1)

  await page.goto('/practicum/learn/plan-wdds')
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  await expect(page.locator('[data-current-activity]')).toHaveAttribute('href', '/practicum/activities/act-01-002')
  await page.goto('/practicum')
  await expect(page.locator('[data-plan-progress] [role="progressbar"]')).not.toHaveAttribute('aria-valuenow', '0')

  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}'))
  expect(record.schemaVersion).toBe(1)
  expect(record.learningPosition['plan-wdds']).toBe('act-01-002')
  expect(record.softwareAttempts['act-01-001'].completedStepIds).toEqual(['step-1-1', 'step-1-2'])
  expect(record.trainingAttempts['act-01-002']).toHaveLength(1)
  expect(record.practiceDrafts['act-01-003']).toBe('统一记录中的实践成果')
  expect(record.practiceSubmissions['act-01-003'].status).toBe('SUBMITTED')
})
