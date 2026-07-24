import { expect, test } from '@playwright/test'

/**
 * Given a student has persisted progress, position, deadline and returned feedback
 * When the student opens the practicum home
 * Then the next activity and every summary are derived from that record
 */
test('[ASSUME-S3-001] student home derives the current learning summary', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-001')
  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()
  await page.locator('[data-complete-software]').click()

  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('等待修改的成果')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const state = JSON.parse(localStorage.getItem(key) ?? '{}')
    state.planDeadlines = { 'plan-wdds': '2026-12-31' }
    state.practiceSubmissions['act-01-003'].status = 'RETURNED'
    state.practiceSubmissions['act-01-003'].feedback = '请补充配置依据。'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await page.goto('/practicum')

  await expect(page.locator('[data-next-task]')).toContainText('店铺基本设置')
  await expect(page.locator('[data-plan-progress] [role="progressbar"]')).not.toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('[data-deadline]')).toContainText('2026-12-31')
  await expect(page.locator('[data-returned-work]')).toContainText('店铺基本设置')
  await expect(page.locator('[data-recent-feedback]')).toContainText('请补充配置依据。')
  await expect(page.locator('[data-route-item]').first().locator('.mini-progress')).not.toHaveAttribute('aria-label', / 0%$/)
})
