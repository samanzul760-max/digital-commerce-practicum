import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

/**
 * Given a student or owner has selected a practicum identity
 * When the user opens the teaching cases list
 * Then six original commerce teaching cases are visible
 */
test('[ORIGINAL-S7-001] both roles can browse six commerce teaching cases', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/cases')
  await expect(page.locator('[data-commerce-cases]')).toBeVisible()
  await expect(page.locator('[data-case-card]')).toHaveCount(6)
  await expect(page.locator('[data-case-card]')).toContainText(['商品卖点提炼'])

  await loginAsOwner(page)
  await page.goto('/practicum/cases')
  await expect(page.locator('[data-commerce-cases]')).toBeVisible()
  await expect(page.locator('[data-case-card]')).toHaveCount(6)
  await expect(page.locator('[data-case-submit-count]')).toContainText('3')
})

/**
 * Given a user opens the teaching case list
 * When the page renders
 * Then the list shows a summary band and separates submittable cases from classroom reading
 */
test('[ORIGINAL-S7-001] commerce case list presents a summary band and grouped sections', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/cases')

  await expect(page.locator('[data-case-summary-band]')).toBeVisible()
  await expect(page.locator('[data-case-summary-band]')).toContainText('6')
  await expect(page.locator('[data-case-summary-band]')).toContainText('3')
  await expect(page.locator('[data-case-group="submittable"]')).toBeVisible()
  await expect(page.locator('[data-case-group="read-only"]')).toBeVisible()
  await expect(page.locator('[data-case-group="submittable"] [data-case-card]')).toHaveCount(3)
  await expect(page.locator('[data-case-group="read-only"] [data-case-card]')).toHaveCount(3)
})

/**
 * Given a student opens a commerce case detail
 * When the case is read-only or submittable
 * Then the page shows student tasks self-check content and appropriate submission state
 */
test('[ORIGINAL-S7-001] student sees case learning content and submission states', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/cases/case-selling-points')

  await expect(page.locator('[data-case-detail]')).toBeVisible()
  await expect(page.locator('[data-case-hero]')).toBeVisible()
  await expect(page.locator('[data-case-briefing]')).toBeVisible()
  await expect(page.locator('[data-student-case-content]')).toBeVisible()
  await expect(page.locator('[data-owner-case-guidance]')).toHaveCount(0)
  await expect(page.locator('[data-case-self-check] input')).toHaveCount(3)

  await page.locator('[data-case-draft]').fill('卖点一：三步开盖，减少新手误操作。')
  await page.locator('[data-save-case-draft]').click()
  await expect(page.locator('[data-case-draft-saved]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-case-draft]')).toHaveValue('卖点一：三步开盖，减少新手误操作。')

  await page.locator('[data-submit-case]').click()
  await page.locator('[data-confirm-submit-case]').click()
  await expect(page.locator('[data-case-status]')).toContainText('已提交')
  await expect(page.locator('[data-case-version]')).toHaveCount(1)

  await page.evaluate(() => {
    const raw = localStorage.getItem('digital-commerce-practicum.v1')
    if (!raw) return
    const state = JSON.parse(raw)
    state.practiceSubmissions['case-node-selling-points'].status = 'RETURNED'
    state.practiceSubmissions['case-node-selling-points'].feedback = '请补充目标人群和使用场景。'
    localStorage.setItem('digital-commerce-practicum.v1', JSON.stringify(state))
  })
  await page.reload()
  await expect(page.locator('[data-case-status]')).toContainText('已退回')
  await expect(page.locator('[data-case-feedback]')).toContainText('请补充目标人群')
})

/**
 * Given an owner opens a commerce case detail
 * When the case has teaching guidance or rubric content
 * Then owner guidance rubric and submission overview are visible without leaking to students
 */
test('[ORIGINAL-S7-001] owner sees teaching guidance and student does not', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/cases/case-review-reply')
  await page.locator('[data-case-draft]').fill('公开回复：理解你的体验，我们会核查发货和包装环节。')
  await page.locator('[data-submit-case]').click()
  await page.locator('[data-confirm-submit-case]').click()

  await loginAsOwner(page)
  await page.goto('/practicum/cases/case-review-reply')
  await expect(page.locator('[data-owner-case-guidance]')).toBeVisible()
  await expect(page.locator('[data-owner-case-rubric]')).toBeVisible()
  await expect(page.locator('[data-case-submission-overview]')).toContainText('1')

  await loginAsStudent(page)
  await page.goto('/practicum/cases/case-review-reply')
  await expect(page.locator('[data-owner-case-guidance]')).toHaveCount(0)
  await expect(page.locator('[data-owner-case-rubric]')).toHaveCount(0)
})

/**
 * Given a user opens an unknown commerce case route
 * When the case id is not in the local case seed
 * Then the page shows a clear missing state
 */
test('[ORIGINAL-S7-001] missing commerce case route shows an empty state', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/cases/not-a-case')
  await expect(page.locator('[data-case-missing]')).toBeVisible()
  await expect(page.locator('[data-case-detail]')).toHaveCount(0)
})
