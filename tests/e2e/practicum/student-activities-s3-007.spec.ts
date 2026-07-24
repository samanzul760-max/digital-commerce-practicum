import { expect, test } from '@playwright/test'

/**
 * Given a student's submitted practice work is in the deterministic returned state
 * When the student confirms a revised submission
 * Then the returned version and feedback remain visible beside the new version
 */
test('[ASSUME-S3-001] student revises returned practice work without losing evidence', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('第一版成果')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-version]')).toHaveCount(1)

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const state = JSON.parse(localStorage.getItem(key) ?? '{}')
    state.practiceSubmissions['act-01-003'].status = 'RETURNED'
    state.practiceSubmissions['act-01-003'].feedback = '请补充店铺设置说明。'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(page.locator('[data-submission-status]')).toHaveText('已退回')
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充店铺设置说明。')

  await page.locator('[data-practice-draft]').fill('第二版补充说明')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-version]')).toHaveCount(2)
  await expect(page.locator('[data-submission-version]').first()).toContainText('第一版成果')
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充店铺设置说明。')
  await page.reload()
  await expect(page.locator('[data-submission-version]')).toHaveCount(2)
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充店铺设置说明。')
})
