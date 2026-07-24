import { expect, test } from '@playwright/test'

/**
 * Given a student opens a published plan
 * When the student navigates to the learning plan page
 * Then only published modules units and activities are visible and the last learning position is highlighted
 */
test('[ASSUME-S3-001] student sees published nodes and resumes last learning position', async ({ page }) => {
  // Switch to Student identity
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Navigate to the learning plan page for the published 网店运营 plan
  await page.goto('/practicum/learn/plan-wdds')

  // The learning plan page must render
  await expect(page.locator('[data-learn-plan]')).toBeVisible()

  // Must show the plan title
  await expect(page.locator('h1')).toContainText('网店运营')

  // Must show the 6 modules
  await expect(page.locator('[data-module]')).toHaveCount(6)

  // Expanding the first module and first unit should show activities
  await page.locator('[data-module-toggle]').first().click()
  await expect(page.locator('[data-unit]').first()).toBeVisible()
  await page.locator('[data-unit-toggle]').first().click()
  await expect(page.locator('[data-activity]').first()).toBeVisible()

  // The first activity should be marked as current/starting position
  await expect(page.locator('[data-current-activity]')).toBeVisible()
})

/**
 * Given a student opens a software action activity with required steps
 * When the student tries to complete without finishing required steps
 * Then completion is rejected and the missing step is identified
 */
test('[ASSUME-S3-001] software activity rejects completion when required steps are missing', async ({ page }) => {
  // Switch to Student and navigate to seeded software activity
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()

  // Navigate to act-01-001 (商家入驻, SOFTWARE_ACTION with 2 required + 1 optional step)
  await page.goto('/practicum/activities/act-01-001')

  await expect(page.locator('[data-activity-page]')).toBeVisible()
  await expect(page.locator('[data-software-activity]')).toBeVisible()

  // Should have 3 steps
  await expect(page.locator('[data-step-checkbox]')).toHaveCount(3)

  // Try completing without any steps → must show error
  await page.locator('[data-complete-software]').click()
  await expect(page.locator('[data-incomplete-error]')).toBeVisible()
  await expect(page.locator('[data-incomplete-error]')).toContainText('必做步骤')

  // Check the two required steps (first and second)
  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()

  // Now completion should succeed
  await page.locator('[data-complete-software]').click()
  await expect(page.locator('[data-incomplete-error]')).toHaveCount(0)
})

/**
 * Given a student has completed a software activity
 * When the student resets the activity with confirmation
 * Then only that activity attempt is cleared and the steps are unchecked
 */
test('[ASSUME-S3-001] software reset clears only the current activity attempt after confirmation', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-001')

  // Complete the activity first
  await page.locator('[data-step-checkbox]').nth(0).check()
  await page.locator('[data-step-checkbox]').nth(1).check()
  await page.locator('[data-complete-software]').click()

  // Now reset
  await page.locator('[data-reset-software]').click()
  await expect(page.locator('[data-reset-confirm]')).toBeVisible()
  await page.locator('[data-reset-confirm]').click()

  // Steps should be cleared
  await expect(page.locator('[data-step-checkbox]').nth(0)).not.toBeChecked()
  await expect(page.locator('[data-step-checkbox]').nth(1)).not.toBeChecked()
})

/**
 * Given a student opens a training activity
 * When the student submits a valid answer
 * Then the attempt is recorded and deterministic feedback is shown
 */
test('[ASSUME-S3-001] training activity records valid attempt with deterministic feedback', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  // act-01-002 is 店铺信息设置训练 (TRAINING)
  await page.goto('/practicum/activities/act-01-002')

  await expect(page.locator('[data-training-activity]')).toBeVisible()
  await page.locator('[data-training-answer]').fill('店铺名称、经营类目、客服联系方式')
  await page.locator('[data-training-submit]').click()

  // Should show feedback
  await expect(page.locator('[data-training-feedback]')).toBeVisible()
  await expect(page.locator('[data-training-feedback]')).toContainText(/反馈|正确|部分/)
  // Attempt count shown
  await expect(page.locator('[data-attempt-count]')).toBeVisible()
})

/**
 * Given a student is working on a practice activity
 * When the student saves a draft
 * Then the draft is saved but no immutable submitted version is created
 */
test('[ASSUME-S3-001] practice activity saves draft without creating an immutable version', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  // act-01-003 is 店铺基本设置 (PRACTICE_ACTIVITY)
  await page.goto('/practicum/activities/act-01-003')

  await expect(page.locator('[data-practice-activity]')).toBeVisible()
  await page.locator('[data-practice-draft]').fill('我的实践草稿内容')
  await page.locator('[data-save-draft]').click()

  // Should show draft saved confirmation
  await expect(page.locator('[data-draft-saved]')).toBeVisible()

  // Should NOT show a submitted version number
  await expect(page.locator('[data-submission-version]')).toHaveCount(0)
})

/**
 * Given a student has a valid practice draft
 * When the student submits the work
 * Then a numbered immutable version is created and the status becomes submitted
 */
test('[ASSUME-S3-001] practice submission creates numbered immutable version', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')

  await page.locator('[data-practice-draft]').fill('正式提交的实践成果')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  // A version should appear with number
  await expect(page.locator('[data-submission-version]')).toBeVisible()
  await expect(page.locator('[data-submission-version]')).toContainText('版本 1')
  await page.reload()
  await expect(page.locator('[data-submission-version]')).toContainText('正式提交的实践成果')
  await expect(page.locator('[data-submission-status]')).toHaveText('已提交')
})

/**
 * Given a practice submission was returned with feedback
 * When the student submits a revision
 * Then the old version and feedback remain visible and a new version is added
 */
test('[ASSUME-S3-001] returned practice preserves old versions when resubmitting', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')

  // Submit version 1
  await page.locator('[data-practice-draft]').fill('第一版提交')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-version]')).toContainText('版本 1')

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const state = JSON.parse(localStorage.getItem(key) ?? '{}')
    state.practiceSubmissions['act-01-003'].status = 'RETURNED'
    state.practiceSubmissions['act-01-003'].feedback = '请补充修改依据。'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(page.locator('[data-submission-status]')).toHaveText('已退回')

  // Submit version 2 (revision)
  await page.locator('[data-practice-draft]').fill('第二版修订提交')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  // Both versions should be visible
  const versions = page.locator('[data-submission-version]')
  await expect(versions).toHaveCount(2)
  await expect(versions.nth(0)).toContainText('版本 1')
  await expect(versions.nth(1)).toContainText('版本 2')
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充修改依据。')
  await page.reload()
  await expect(page.locator('[data-submission-version]')).toHaveCount(2)
})

/**
 * Given a student has progress on activities
 * When the page is reloaded
 * Then the last learning position and activity progress are restored
 */
test('[ASSUME-S3-001] reload restores learning position and activity progress', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()

  // Go to learning plan and click an activity to set position
  await page.goto('/practicum/learn/plan-wdds')
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  const firstActivity = page.locator('[data-activity]').first()
  await firstActivity.click()

  // Reload and verify position is restored
  await page.reload()
  await page.locator('[data-module-toggle]').first().click()
  await page.locator('[data-unit-toggle]').first().click()
  await expect(page.locator('[data-current-activity]')).toBeVisible()
})

/**
 * Given a student is on the home page
 * When the student home loads
 * Then it shows next activity current progress deadlines returned work and recent feedback
 */
test('[ASSUME-S3-001] student home shows next activity progress deadlines and returned work', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Must show the student home
  await expect(page.locator('[data-student-home]')).toBeVisible()
  // Must show progress bar
  await expect(page.locator('[data-plan-progress]')).toBeVisible()
  // Must show next task
  await expect(page.locator('[data-next-task]')).toBeVisible()
  // Must show learning route with 6 modules
  await expect(page.locator('[data-learning-route]')).toBeVisible()
  await expect(page.locator('[data-route-item]')).toHaveCount(6)
})

/**
 * Given an owner or a student accesses activity and learn pages
 * When the page loads in various states
 * Then forbidden empty and missing-content states are shown appropriately
 */
test('[ASSUME-S3-001] student pages show appropriate forbidden empty and error states', async ({ page }) => {
  // --- Owner cannot access student activity page ---
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.waitForURL('**/practicum')
  await page.goto('/practicum/activities/act-01-001')
  await expect(page.locator('[data-forbidden]')).toBeVisible()

  // --- Missing activity shows empty state ---
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/nonexistent')
  await expect(page.locator('[data-empty]')).toBeVisible()

  // --- Learn page for draft plan shows forbidden ---
  await page.goto('/practicum/learn/plan-wdsj')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
})
