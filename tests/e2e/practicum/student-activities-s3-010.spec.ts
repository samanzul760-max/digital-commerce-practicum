import { expect, test } from '@playwright/test'

/**
 * Given a student opens learning and activity routes in every applicable state
 * When the student navigates, edits, submits and follows protected direct URLs
 * Then each state has a visible outcome without exposing forbidden content
 */
test('[ASSUME-S3-001] student routes expose every applicable learning state', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  const loadingNavigation = page.locator('[data-next-task] a').click()
  await expect(page.locator('[data-loading]')).toBeVisible()
  await loadingNavigation
  await expect(page).toHaveURL('/practicum/activities/act-01-001')
  await page.locator('[data-complete-software]').click()
  await expect(page.locator('[data-incomplete-error]')).toBeVisible()

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const state = JSON.parse(localStorage.getItem(key) ?? '{}')
    state.lockedActivityIds = ['act-01-002']
    state.plans.find((plan: { id: string }) => plan.id === 'plan-wdsj').status = 'PUBLISHED'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.goto('/practicum/activities/act-01-002')
  await expect(page.locator('[data-locked]')).toBeVisible()
  await expect(page.locator('[data-training-answer]')).toHaveCount(0)
  await page.goto('/practicum/learn/plan-wdsj')
  await expect(page.locator('[data-empty]')).toBeVisible()

  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('尚未保存的修改')
  await page.locator('[data-back-link]').click()
  await expect(page.locator('[data-unsaved-leave]')).toBeVisible()
  await page.locator('[data-cancel-leave]').click()
  await expect(page).toHaveURL('/practicum/activities/act-01-003')
  await page.locator('[data-back-link]').click()
  await page.locator('[data-discard-leave]').click()
  await expect(page).toHaveURL('/practicum/learn/plan-wdds')

  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('正式提交状态')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-status]')).toHaveText('已提交')
  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const state = JSON.parse(localStorage.getItem(key) ?? '{}')
    state.practiceSubmissions['act-01-003'].status = 'RETURNED'
    state.practiceSubmissions['act-01-003'].feedback = '请按要求修改。'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(page.locator('[data-submission-status]')).toHaveText('已退回')

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.getByText('店铺基本设置', { exact: true })).toHaveCount(0)

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/missing-content')
  await expect(page.locator('[data-empty]')).toBeVisible()
})
